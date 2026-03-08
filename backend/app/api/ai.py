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
            await asyncio.sleep(0.5)
            
            yield f"data: {json.dumps({'text': '**Deep Analysis Report**\\n\\n'})}\n\n"
            report_body = (
                f"**Summary**: {cached_result.get('summary_short', 'N/A')}\\n\\n"
                f"**Sentiment**: {cached_result.get('sentiment', 'Neutral')}\\n"
                f"**Bias Analysis**: {cached_result.get('bias_explanation', 'N/A')} (Score: {cached_result.get('bias_score', 0)})\\n\\n"
                f"**Detailed Summary**:\\n{cached_result.get('summary_detail', 'N/A')}\\n\\n"
                f"**Tags**: {', '.join(cached_result.get('tags', [])) if cached_result.get('tags') else 'None'}"
            )
            for word in report_body.split(" "):
                yield f"data: {json.dumps({'text': word + ' '})}\n\n"
                await asyncio.sleep(0.01)
                
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

            # Cache the result for 24 hours (analyses don't go stale)
            await cache.set(cache_key, final_data, ttl=86400)
            logger.info("Cached analysis for article %s", article.id)

            yield f"data: {json.dumps({'status': 'progress', 'agent': 'reporter', 'message': 'Formatting report...'})}\n\n"
            
            # Optional UX: Stream the report text itself so frontend can show words appearing
            yield f"data: {json.dumps({'text': '**Deep Analysis Report**\\n\\n'})}\n\n"
            await asyncio.sleep(0.1)
            
            report_body = (
                f"**Summary**: {final_data.get('summary_short', 'N/A')}\\n\\n"
                f"**Sentiment**: {final_data.get('sentiment', 'Neutral')}\\n"
                f"**Bias Analysis**: {final_data.get('bias_explanation', 'N/A')} (Score: {final_data.get('bias_score', 0)})\\n\\n"
                f"**Detailed Summary**:\\n{final_data.get('summary_detail', 'N/A')}\\n\\n"
                f"**Tags**: {', '.join(final_data.get('tags', [])) if final_data.get('tags') else 'None'}"
            )
            
            for word in report_body.split(" "):
                yield f"data: {json.dumps({'text': word + ' '})}\n\n"
                await asyncio.sleep(0.01)

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

    # If a specific article is selected, its context is provided by the frontend.
    # No need to look up NewsArticle in DB — the frontend passes title/description/content directly.

    # If no context and no article — build context from user's cached daily feed
    if not context_text and not request.article_id:
        # Try UserDailyCache first (always populated by our feed flow)
        cache_result = await db.execute(
            select(UserDailyCache).where(UserDailyCache.user_id == current_user.id)
        )
        cache_entry = cache_result.scalars().first()

        feed_articles = []
        if cache_entry and cache_entry.news_feed:
            feed_articles = cache_entry.news_feed  # list of dicts

        if not feed_articles:
            # Fallback: fetch live from aggregator
            from app.services.providers.aggregator import news_aggregator
            live_articles = await news_aggregator.fetch_feed(limit=10, use_cache=True)
            feed_articles = [{"title": a.title, "description": a.description} for a in live_articles]

        if not feed_articles:
            return {"answer": "No articles found in your feed yet. Please refresh your news feed first, then try asking again."}

        # Keyword match against cached feed for relevance
        import re
        keywords = [w.lower() for w in re.split(r'\W+', request.question) if len(w) > 3]

        def relevance_score(art: dict) -> int:
            text = f"{art.get('title', '')} {art.get('description', '')}".lower()
            return sum(1 for kw in keywords if kw in text)

        if keywords:
            scored = sorted(feed_articles, key=relevance_score, reverse=True)
            # Take top matches (relevance > 0), fallback to most recent
            relevant = [a for a in scored if relevance_score(a) > 0][:8]
            if not relevant:
                relevant = feed_articles[:8]
        else:
            relevant = feed_articles[:8]

        context_text = "Here are recent news articles from the user's feed:\n\n"
        for art in relevant:
            title = art.get("title", "")
            desc = art.get("description", "")
            if desc and len(desc) > 400:
                desc = desc[:400] + "..."
            context_text += f"- Title: {title}\n  Summary: {desc}\n\n"

    prompt = ChatPromptTemplate.from_template(
        """You are a helpful and knowledgeable AI news assistant for NewsAI.
You have access to the user's current news feed as context.

When the user asks about news, current events, or general knowledge topics:
- Answer based on the provided context if relevant articles exist.
- If the context doesn't cover their exact question but you have general knowledge, provide a helpful answer and mention that the specific topic wasn't in their current feed.
- Provide insightful, well-structured responses.

When the user asks about a specific article they've selected:
- Answer strictly based on the article's content.

Context:
{context}

Question: {question}"""
    )
    
    async def ask_generator():
        try:
            from app.services.ai_agents.llm_manager import llm_manager
            
            full_content = ""
            provider_name = "Unknown"
            
            async for chunk_type, chunk_data in llm_manager.stream_with_fallback(
                prompt=prompt,
                parser=StrOutputParser(),
                input_data={"context": context_text, "question": request.question}
            ):
                if chunk_type == "provider":
                    provider_name = chunk_data
                elif chunk_type == "chunk":
                    full_content += chunk_data
                    yield f"data: {json.dumps({'text': chunk_data})}\n\n"
            
            # Final event to indicate end of stream
            logger.info(f"AI Ask fulfilled with {provider_name}")
            
            try:
                from app.models.payment import AIUsageLog
                from app.db.session import AsyncSessionLocal
                async with AsyncSessionLocal() as session:
                    log = AIUsageLog(
                        user_id=current_user.id,
                        action="ask_ai",
                        tokens_used=max(len(full_content) // 4, 10)
                    )
                    session.add(log)
                    await session.commit()
            except Exception as db_e:
                logger.error("Failed to log ask_ai usage", exc_info=db_e)
            
            yield f"data: {json.dumps({'status': 'done'})}\n\n"

        except Exception as e:
            status_code, detail = handle_ai_error(e)
            yield f"data: {json.dumps({'status': 'error', 'error_code': detail.get('error_code'), 'message': detail.get('message')})}\n\n"

    return StreamingResponse(ask_generator(), media_type="text/event-stream")


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
            async def cached_summary_generator():
                # Provide cached summary immediately over SSE
                yield f"data: {json.dumps({'text': cache_entry.summary.get('summary', '')})}\n\n"
                yield f"data: {json.dumps({'status': 'done'})}\n\n"
            return StreamingResponse(cached_summary_generator(), media_type="text/event-stream")

    if settings.NEWS_MODE == "TEST":
        async def mock_generator():
            await asyncio.sleep(1)
            mock_text = "This is a mock daily briefing summary generated in TEST mode. The AI agents have analyzed the latest test headlines and identified key trends in technology and finance. The market is showing positive momentum, and new AI tools are being released rapidly. (Mock Data)"
            
            for word in mock_text.split(" "):
                yield f"data: {json.dumps({'text': word + ' '})}\n\n"
                await asyncio.sleep(0.05)
            
            response_data = {"summary": mock_text}
            await _update_daily_cache(db, current_user, response_data)

            yield f"data: {json.dumps({'status': 'done'})}\n\n"
        
        return StreamingResponse(mock_generator(), media_type="text/event-stream")

    from app.services.providers.aggregator import news_aggregator

    prefs = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = prefs.scalars().first()

    category = None
    if prefs and prefs.favorite_categories:
        category = prefs.favorite_categories[0]

    try:
        articles = await news_aggregator.fetch_feed(category=category, limit=8, use_cache=True)

        if not articles:
            return {"summary": "No news in your feed yet. Try refreshing your feed first."}

        combined_content = "\n\n".join([f"Title: {a.title}\nSummary: {a.description}" for a in articles[:6]])

        prompt = ChatPromptTemplate.from_template(
            "Summarize the following latest news highlights into a single cohesive daily briefing paragraph (3-5 sentences).\n\nNews:\n{news}"
        )

        async def summary_generator():
            try:
                from app.services.ai_agents.llm_manager import llm_manager
                
                full_summary = ""
                provider_name = "Unknown"
                
                async for chunk_type, chunk_data in llm_manager.stream_with_fallback(
                    prompt=prompt,
                    parser=StrOutputParser(),
                    input_data={"news": combined_content}
                ):
                    if chunk_type == "provider":
                        provider_name = chunk_data
                    elif chunk_type == "chunk":
                        full_summary += chunk_data
                        yield f"data: {json.dumps({'text': chunk_data})}\n\n"
                
                logger.info(f"Feed summary fulfilled with {provider_name}")
                
                try:
                    from app.models.payment import AIUsageLog
                    from app.db.session import AsyncSessionLocal
                    async with AsyncSessionLocal() as session:
                        log = AIUsageLog(
                            user_id=current_user.id,
                            action="feed_summary",
                            tokens_used=max(len(full_summary) // 4, 10)
                        )
                        session.add(log)
                        
                        # Cache the completed summary into the DB at the end
                        response_data = {"summary": full_summary}
                        await _update_daily_cache(session, current_user, response_data)
                        await session.commit()
                except Exception as db_e:
                    logger.error("Failed to log feed summary usage", exc_info=db_e)
                
                yield f"data: {json.dumps({'status': 'done'})}\n\n"
            
            except Exception as e:
                status_code, detail = handle_ai_error(e)
                yield f"data: {json.dumps({'status': 'error', 'error_code': detail.get('error_code'), 'message': detail.get('message')})}\n\n"
        
        return StreamingResponse(summary_generator(), media_type="text/event-stream")

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
    if "deadline_exceeded" in msg.lower() or "504" in msg or "timed out" in msg.lower() or "timeout" in msg.lower():
        return 504, {
            "error_code": "AI_TIMEOUT",
            "message": "AI request timed out. Please try again."
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
