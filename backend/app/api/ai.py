from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.api import deps
from app.core.config import settings
from app.models.user import User
# from app.models.news import NewsArticle # Removed persistence dependency
from app.models.news import UserPreference, NewsCategory # Kept for prefs
from app.models.daily_cache import UserDailyCache
from app.models.payment import AIUsageLog
from app.services.ai_agents.graph import news_graph
from app.services.ai_agents.nodes import call_llm_with_rotation
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy import func
import json
import asyncio

router = APIRouter()

# Schema for Stateless Article Processing
from pydantic import BaseModel
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
    """
    Manually trigger AI processing for an article (Stateless).
    Checks rates and premium status.
    Returns a stream of progress events.
    Body must contain article details.
    """
    import asyncio

    # Premium Check Logic
    if not current_user.is_premium:
        # Check Daily Limit
        await check_ai_limit(db, current_user.id)

    async def event_generator():
        # Prepare State using provided body payload
        initial_state = {
            "article_id": article.id,
            "title": article.title,
            "content": article.content or article.description or "",
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
                    
                    # Yield event
                    agent_name = key
                    messages = {
                        "collector": "Gathering and cleaning content...",
                        "classifier": "Classifying topic and sentiment...",
                        "summarizer": "Generating concise summaries...",
                        "bias": "Analyzing political bias...",
                    }
                    msg = messages.get(agent_name, f"Processing {agent_name}...")
                    yield f"data: {json.dumps({'status': 'progress', 'agent': agent_name, 'message': msg})}\n\n"
            
            # Streaming Complete - Use accumulated state for final result
            # No DB Saving!
            
            # Log Usage
            log = AIUsageLog(
                user_id=current_user.id,
                action="process_article",
                tokens_used=1000 
            )
            db.add(log)
            await db.commit()
            
            # Return final data
            final_data = {
                "id": article.id,
                "summary_short": accumulated_state.get("summary_short"),
                "summary_detail": accumulated_state.get("summary_detail"),
                "sentiment": accumulated_state.get("sentiment"),
                "tags": accumulated_state.get("tags"),
                "bias_score": accumulated_state.get("bias_score"),
                "bias_explanation": accumulated_state.get("bias_explanation")
            }
            yield f"data: {json.dumps({'status': 'complete', 'article': final_data})}\n\n"
            
        except Exception as e:
            status_code, detail = handle_ai_error(e)
            # For streaming, we yield the error structure
            yield f"data: {json.dumps({'status': 'error', 'error_code': detail.get('error_code'), 'message': detail.get('message')})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/explain")
async def explain_article(
    article: ArticleContext, 
    style: str = "eli5", # eli5 or interview
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Explain an article in specific style (Stateless).
    """
    if not current_user.is_premium:
         await check_ai_limit(db, current_user.id)

    content = article.content or article.description or ""
    
    if style == "interview":
        template = "Explain the following article as if you are being interviewed about it. Content: {content}"
    else:
        template = "Explain the following article like I am 5 years old (ELI5). Content: {content}"
        
    prompt = ChatPromptTemplate.from_template(template)
    
    try:
        explanation = await call_llm_with_rotation(
            prompt, 
            StrOutputParser(), 
            {"content": content}
        )
    except Exception as e:
        status_code, detail = handle_ai_error(e)
        raise HTTPException(status_code=status_code, detail=detail)
    
    log = AIUsageLog(
        user_id=current_user.id,
        action=f"explain_{style}",
        tokens_used=500
    )
    db.add(log)
    await db.commit()
    
    return {"explanation": explanation}

@router.post("/ask")
async def ask_ai(
    question: str = Body(...),
    context: str = Body(default=""),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_premium_user) # Premium only
) -> Any:
    """
    Ask AI questions about news (Premium Only).
    Stateless: Request must provide context.
    """
    combined_context = context or ""
    
    prompt = ChatPromptTemplate.from_template(
        "Answer the user's question based on the provided context.\n\nContext:\n{context}\n\nQuestion: {question}"
    )
    
    try:
        answer = await call_llm_with_rotation(
            prompt,
            StrOutputParser(),
            {"context": combined_context, "question": question}
        )
    except Exception as e:
        status_code, detail = handle_ai_error(e)
        raise HTTPException(status_code=status_code, detail=detail)
    
    log = AIUsageLog(
        user_id=current_user.id,
        action="ask_ai",
        tokens_used=500
    )
    db.add(log)
    await db.commit()
    
    return {"answer": answer}

# Helper
async def check_ai_limit(db: AsyncSession, user_id: Any):
    from datetime import datetime, timedelta, timezone
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    result = await db.execute(
        select(func.count()).select_from(AIUsageLog)
        .where(AIUsageLog.user_id == user_id)
        .where(AIUsageLog.created_at >= today)
    )
    count = result.scalar()
    
    LIMIT = 5 
    if count >= LIMIT:
        raise HTTPException(status_code=429, detail={"error_code": "AI_RATE_LIMIT", "message": f"Daily AI limit reached ({LIMIT}/{LIMIT}). Upgrade to Premium for unlimited access."})

@router.post("/compare")
async def compare_articles(
    articles: List[str] = Body(...), # List of contents/summaries
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_premium_user) # Premium only
) -> Any:
    """
    Compare multiple articles (Premium).
    Receives list of text contents to compare.
    """
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
    
    log = AIUsageLog(
        user_id=current_user.id,
        action="compare",
        tokens_used=1000
    )
    db.add(log)
    await db.commit()
    
    return {"comparison": comparison}

@router.post("/feed/summary")
async def summarize_feed(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Generate a summary of the user's current feed (Stateless Fetching).
    """
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()

    if current_user.is_premium:
        # Pro: Unlimited Refresh
        pass
    else:
        # Free: Check Cache First
        existing_cache = await db.execute(
            select(UserDailyCache)
            .where(UserDailyCache.user_id == current_user.id)
            .where(UserDailyCache.expires_at > datetime.now(timezone.utc))
        )
        cache_entry = existing_cache.scalars().first()
        
        if cache_entry and cache_entry.summary:
            # Return cached summary
            return cache_entry.summary
        
        # If no cache (or expired), proceed to generate NEW summary (and cache it at the end)

    if settings.NEWS_MODE == "TEST":
        await asyncio.sleep(2) # Simulate delay
        response_data = {
            "summary": "This is a mock daily briefing summary generated in TEST mode. The AI agents have analyzed the latest test headlines and identified key trends in technology and finance. The market is showing positive momentum, and new AI tools are being released rapidly. (Mock Data)"
        }
        
        # Cache for Free Users (even in test mode to support flow)
        if not current_user.is_premium:
             from datetime import timedelta
             cache_check = await db.execute(select(UserDailyCache).where(UserDailyCache.user_id == current_user.id))
             user_cache = cache_check.scalars().first()
             
             if user_cache:
                 user_cache.summary = response_data
                 user_cache.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
             else:
                  user_cache = UserDailyCache(
                      user_id=current_user.id,
                      news_feed=None,
                      summary=response_data,
                      expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
                  )
                  db.add(user_cache)
             
             # Update User last refresh date
             current_user.last_summary_refresh_date = datetime.now(timezone.utc)
             db.add(current_user)
             
             await db.commit()
             
        return response_data

    from app.services.currents import currents_service
    
    # Prefs
    prefs = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = prefs.scalars().first()
    
    category = None
    if prefs and prefs.favorite_categories:
        category = prefs.favorite_categories[0]
        
    try:
        # Fetch directly
        articles = await currents_service.fetch_latest_news(category=category)
        
        # Limit to top 5 for summary
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
        
        # Cache for Free Users
        if not current_user.is_premium:
            from datetime import timedelta
            
            cache_check = await db.execute(select(UserDailyCache).where(UserDailyCache.user_id == current_user.id))
            user_cache = cache_check.scalars().first()
            
            if user_cache:
                user_cache.summary = response_data
                # We update expires_at only if it's expired? 
                # Or extend it? If they generated news 2 hours ago, and summary now.
                # If we extend, news feed persists longer.
                # Simplest: Set expires_at to 24h from NOW. 
                user_cache.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            else:
                 user_cache = UserDailyCache(
                     user_id=current_user.id,
                     news_feed=None,
                     summary=response_data,
                     expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
                 )
                 db.add(user_cache)
            
            # Update User last refresh date
            current_user.last_summary_refresh_date = datetime.now(timezone.utc)
            db.add(current_user)
            
            await db.commit()
            
        return response_data
        
    except Exception as e:
        status_code, detail = handle_ai_error(e)
        raise HTTPException(status_code=status_code, detail=detail)
            
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
