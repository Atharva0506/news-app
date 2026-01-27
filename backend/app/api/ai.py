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
from app.models.payment import AIUsageLog
from app.services.ai_agents.graph import news_graph
from app.services.ai_agents.nodes import llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy import func
import json

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
            error_msg = handle_ai_error(e)
            yield f"data: {json.dumps({'status': 'error', 'message': error_msg})}\n\n"

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
    chain = prompt | llm | StrOutputParser()
    
    try:
        explanation = await chain.ainvoke({"content": content})
    except Exception as e:
        raise HTTPException(status_code=503, detail=handle_ai_error(e))
    
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
    chain = prompt | llm | StrOutputParser()
    
    try:
        answer = await chain.ainvoke({"context": combined_context, "question": question})
    except Exception as e:
        raise HTTPException(status_code=503, detail=handle_ai_error(e))
    
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
        raise HTTPException(status_code=429, detail=f"Daily AI limit reached ({LIMIT}/{LIMIT}). Upgrade to Premium for unlimited access.")

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
    chain = prompt | llm | StrOutputParser()
    
    try:
        comparison = await chain.ainvoke({"text": combined_text})
    except Exception as e:
         raise HTTPException(status_code=503, detail=handle_ai_error(e))
    
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
        chain = prompt | llm | StrOutputParser()
        
        summary = await chain.ainvoke({"news": combined_content})
        return {"summary": summary}
        
    except Exception as e:
        raise HTTPException(status_code=503, detail=handle_ai_error(e))
            
def handle_ai_error(e: Exception) -> str:
    msg = str(e)
    if "quota" in msg.lower() or "429" in msg:
        return "AI Service Quota Exceeded. Please try again later."
    if "recitation" in msg.lower() or "safety" in msg.lower():
         return "Content flagged by safety filters."
    return f"AI Error: {msg}"
# Update other endpoints to use try/except block
    # ... (I need to update them individually or via decorator? I will do it inline for simplicity)
