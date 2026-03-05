import logging
import json
import asyncio
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from pydantic import BaseModel

from app.api import deps
from app.core.config import settings
from app.core.cache import cache
from app.models.user import User
from app.models.news import UserPreference
from app.models.daily_cache import UserDailyCache
from app.models.payment import AIUsageLog
from app.services.ai_agents.graph import news_graph
from app.services.ai_agents.nodes import call_llm_with_rotation
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.core.plan_checker import assert_deep_analysis_access, increment_deep_analysis_usage

logger = logging.getLogger("app.api.ai")
router = APIRouter()

class ArticleContext(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    content: Optional[str] = ""
    author: Optional[str] = None
    published_at: Optional[str] = None
    url: Optional[str] = None

@router.post("/process")
async def process_article(
    article: ArticleContext,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:

    if not article.content and not article.description:
        raise HTTPException(status_code=400, detail="Article content or description is required for analysis.")

    await assert_deep_analysis_access(current_user, db)

    # Check cache first — avoid re-analyzing the same article
    cache_key = f"analysis:{article.id}"
    cached_result = await cache.get(cache_key)
    if cached_result:
        logger.info("Cache HIT for article %s", article.id)
        # Still need to count usage even from cache
        await increment_deep_analysis_usage(current_user, db)
        await db.commit()

        async def cached_stream():
            yield f"data: {json.dumps({'status': 'starting', 'message': 'Loading cached analysis...'})}\n\n"
            yield f"data: {json.dumps({'status': 'complete', 'article': cached_result})}\n\n"
        return StreamingResponse(cached_stream(), media_type="text/event-stream")

    async def event_generator():
        initial_state = {
            "article_id": article.id,
            "title": article.title,
            "content": article.content or article.description,
            "is_premium": current_user.is_premium,
            "quality_score": 1.0
        }

        yield f"data: {json.dumps({'status': 'starting', 'message': 'Initializing AI Agents...'})}\n\n"

        try:
            accumulated_state = initial_state.copy()
            async for chunk in news_graph.astream(initial_state):
                for key, val in chunk.items():
                    if isinstance(val, dict):
                        accumulated_state.update(val)

                    agent_name = key
                    messages = {
                        "collector": "Gathering and cleaning content...",
                        "classifier": "Classifying topic and sentiment...",
                        "summarizer": "Generating concise summaries...",
                        "bias": "Analyzing political bias...",
                    }
                    msg = messages.get(agent_name, f"Processing {agent_name}...")
                    yield f"data: {json.dumps({'status': 'progress', 'agent': agent_name, 'message': msg})}\n\n"

            # Estimate tokens from accumulated output (~4 chars per token)
            estimated_tokens = sum(len(str(v)) for v in accumulated_state.values() if isinstance(v, str)) // 4
            log = AIUsageLog(
                user_id=current_user.id,
                action="process_article",
                tokens_used=max(estimated_tokens, 100)
            )
            db.add(log)
            await increment_deep_analysis_usage(current_user, db)
            await db.commit()

            final_data = {
                "id": article.id,
                "summary_short": accumulated_state.get("summary_short"),
                "summary_detail": accumulated_state.get("summary_detail"),
                "sentiment": accumulated_state.get("sentiment"),
                "tags": accumulated_state.get("tags"),
                "bias_score": accumulated_state.get("bias_score"),
                "bias_explanation": accumulated_state.get("bias_explanation")
            }

            # Cache the result for 1 hour
            await cache.set(cache_key, final_data, ttl=3600)
            logger.info("Cached analysis for article %s", article.id)

            yield f"data: {json.dumps({'status': 'complete', 'article': final_data})}\n\n"

        except Exception as e:
            status_code, detail = handle_ai_error(e)
            yield f"data: {json.dumps({'status': 'error', 'error_code': detail.get('error_code'), 'message': detail.get('message')})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


class AskRequest(BaseModel):
    question: str
    article_id: Optional[str] = None
    context: Optional[str] = ""

@router.post("/ask")
async def ask_ai(
    request: AskRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    if current_user.plan_type == "free" and not current_user.is_premium:
         raise HTTPException(status_code=403, detail="Upgrade to Pro to use AI Q&A.")

    context_text = request.context

    from app.models.news import NewsArticle
    if request.article_id:
        result = await db.execute(select(NewsArticle).where(NewsArticle.id == request.article_id))
        article = result.scalars().first()
        if article:
            context_text = f"Title: {article.title}\nDescription: {article.description}\nContent: {article.content or ''}"
            context_text = context_text[:2000]

    if not context_text and not request.article_id:
        import re
        keywords = [w for w in re.split(r'\W+', request.question) if len(w) > 4]

        query = select(NewsArticle).order_by(desc(NewsArticle.published_at)).limit(10)

        if keywords:
            from sqlalchemy import or_
            filters = [NewsArticle.title.ilike(f"%{kw}%") for kw in keywords]
            query = query.where(or_(*filters))

        result = await db.execute(query)
        articles = result.scalars().all()

        if not articles and keywords:
             fallback_query = select(NewsArticle).order_by(desc(NewsArticle.published_at)).limit(10)
             result = await db.execute(fallback_query)
             articles = result.scalars().all()

        if not articles:
            return {"answer": "No articles found in your feed yet. Please refresh your news feed first, then try asking again."}

        if articles:
            context_text = "Here are some relevant articles found in our database:\n\n"
            for art in articles:
                content_snippet = art.content if art.content else art.description
                if content_snippet and len(content_snippet) > 500:
                    content_snippet = content_snippet[:500] + "..."

                context_text += f"- Title: {art.title}\n  Summary: {art.description}\n  Content: {content_snippet}\n\n"

    prompt = ChatPromptTemplate.from_template(
        """
        You are a helpful AI news assistant.
        Answer the user's question based strictly on the provided context if relevant.
        If the answer is not in the context, say "I couldn't find that in the article."
        
        Context:
        {context}
        
        Question: {question}
        """
    )

    try:
        answer = await call_llm_with_rotation(
            prompt,
            StrOutputParser(),
            {"context": context_text, "question": request.question}
        )
    except Exception as e:
        status_code, detail = handle_ai_error(e)
        raise HTTPException(status_code=status_code, detail=detail)

    return {"answer": answer}


@router.post("/compare")
async def compare_articles(
    articles: List[str] = Body(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_premium_user)
) -> Any:
    if len(articles) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 articles to compare")

    combined_text = "\n\n--- Next Article ---\n\n".join(articles)

    prompt = ChatPromptTemplate.from_template(
        "Compare and contrast the following articles. Highlight key differences and similarities.\n\n{text}"
    )

    try:
        comparison = await call_llm_with_rotation(
            prompt,
            StrOutputParser(),
            {"text": combined_text}
        )
    except Exception as e:
         status_code, detail = handle_ai_error(e)
         raise HTTPException(status_code=status_code, detail=detail)

    estimated_tokens = len(comparison) // 4
    log = AIUsageLog(
        user_id=current_user.id,
        action="compare",
        tokens_used=max(estimated_tokens, 100)
    )
    db.add(log)
    await db.commit()

    return {"comparison": comparison}

@router.post("/feed/summary")
async def summarize_feed(
    refresh: bool = Body(False, embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    from datetime import datetime, timezone
    from app.core.plan_checker import check_trial_expiration

    # Ensure trial status is up to date
    current_user = await check_trial_expiration(current_user, db)

    # For free users: enforce 1 summary per day
    if current_user.plan_type == "free":
        today = datetime.now(timezone.utc).date()
        if current_user.last_summary_refresh_date and current_user.last_summary_refresh_date.date() == today:
            raise HTTPException(
                status_code=403,
                detail="Free plan: 1 summary per day. Upgrade to Pro for unlimited."
            )

    if not refresh:
        existing_cache = await db.execute(
            select(UserDailyCache)
            .where(UserDailyCache.user_id == current_user.id)
            .where(UserDailyCache.expires_at > datetime.now(timezone.utc))
        )
        cache_entry = existing_cache.scalars().first()

        if cache_entry and cache_entry.summary:
            return cache_entry.summary

    if settings.NEWS_MODE == "TEST":
        await asyncio.sleep(2)
        response_data = {
            "summary": "This is a mock daily briefing summary generated in TEST mode. The AI agents have analyzed the latest test headlines and identified key trends in technology and finance. The market is showing positive momentum, and new AI tools are being released rapidly. (Mock Data)"
        }
        await _update_daily_cache(db, current_user, response_data)
        return response_data

    from app.services.currents import currents_service

    prefs = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = prefs.scalars().first()

    category = None
    if prefs and prefs.favorite_categories:
        category = prefs.favorite_categories[0]

    try:
        articles = await currents_service.fetch_latest_news(category=category)
        articles = articles[:5]

        if not articles:
            return {"summary": "No news in your feed."}

        combined_content = "\n\n".join([f"Title: {a.get('title')}\nSummary: {a.get('description')}" for a in articles])

        prompt = ChatPromptTemplate.from_template(
            "Summarize the following latest news highlights into a single cohesive daily briefing paragraph.\n\nNews:\n{news}"
        )

        summary_text = await call_llm_with_rotation(
            prompt,
            StrOutputParser(),
            {"news": combined_content}
        )

        response_data = {"summary": summary_text}

        await _update_daily_cache(db, current_user, response_data)

        return response_data

    except Exception as e:
        status_code, detail = handle_ai_error(e)
        raise HTTPException(status_code=status_code, detail=detail)

async def _update_daily_cache(db: AsyncSession, user: User, data: dict):
    from datetime import datetime, timezone, timedelta

    result = await db.execute(select(UserDailyCache).where(UserDailyCache.user_id == user.id))
    user_cache = result.scalars().first()

    if user_cache:
        user_cache.summary = data
        user_cache.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    else:
        user_cache = UserDailyCache(
            user_id=user.id,
            news_feed=None,
            summary=data,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        db.add(user_cache)

    user.last_summary_refresh_date = datetime.now(timezone.utc)
    db.add(user)

    await db.commit()

def handle_ai_error(e: Exception) -> tuple[int, dict]:
    msg = str(e)
    if "quota" in msg.lower() or "429" in msg or "resourceexhausted" in msg.lower():
        return 429, {
            "error_code": "AI_RATE_LIMIT",
            "message": "AI limit reached. Please try again later."
        }
    if "recitation" in msg.lower() or "safety" in msg.lower():
         return 400, {
            "error_code": "AI_SAFETY_FILTER",
            "message": "Content flagged by safety filters."
         }
    return 503, {
        "error_code": "AI_SERVICE_ERROR",
        "message": f"AI Error: {msg}"
    }
