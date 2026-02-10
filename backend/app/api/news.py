from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.api import deps
from app.models.news import NewsArticle
from app.schemas.news import News as NewsSchema
from app.services.currents import currents_service

router = APIRouter()

@router.get("/feed", response_model=List[NewsSchema])
@router.get("/feed", response_model=List[NewsSchema])
async def get_news_feed(
    db: AsyncSession = Depends(deps.get_db),
    limit: int = 5,
    offset: int = 0,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get latest news articles directly from Currents API (Stateless).
    Authed only. Free users limited to 2 articles.
    """
    from app.models.news import UserPreference
    from app.models.user import User
    from app.models.daily_cache import UserDailyCache
    from datetime import datetime, timezone
    import uuid

    today = datetime.now(timezone.utc).date()
    
    # 1. HANDLE SEARCH OR CATEGORY FILTER (Stateless, not cached as daily feed)
    if category or search:
        # Rate Limiting for Free Users
        if not current_user.is_premium:
             from sqlalchemy import func
             from app.models.payment import AIUsageLog
             
             today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
             usage_check = await db.execute(
                 select(func.count(AIUsageLog.id))
                 .where(AIUsageLog.user_id == current_user.id)
                 .where(AIUsageLog.action == "news_search")
                 .where(AIUsageLog.created_at >= today_start)
             )
             count = usage_check.scalar() or 0
             if count >= 5: # Limit free searches to 5 per day
                 raise HTTPException(status_code=429, detail="Daily search limit reached. Upgrade to Premium.")

        # Fetch logic (Same as before)
        prefs_result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
        prefs = prefs_result.scalars().first()
        lang = prefs.language if prefs else "en"
        country = prefs.country if prefs else "us"
        type_map = {"news": 1, "articles": 2, "discussion": 3}
        type_int = type_map.get(prefs.content_type, 1) if prefs else 1
        
        try:
            raw_news = []
            if search:
                raw_news = await currents_service.fetch_search_news(keywords=search, category=category, language=lang, country=country, type_=type_int)
            else:
                raw_news = await currents_service.fetch_latest_news(category=category, language=lang, country=country, type_=type_int)
                
            # Log usage
            if not current_user.is_premium:
                 from app.models.payment import AIUsageLog
                 db.add(AIUsageLog(user_id=current_user.id, action="news_search", tokens_used=0))
                 await db.commit()

            # Transform
            articles = []
            for item in raw_news:
                pub_date = datetime.now(timezone.utc)
                if item.get("published"):
                     try: pub_date = datetime.strptime(item.get("published"), "%Y-%m-%d %H:%M:%S %z")
                     except: pass
                
                articles.append(NewsSchema(
                    id=item.get("id") or str(uuid.uuid4()),
                    title=item.get("title", "No Title"),
                    description=item.get("description", ""),
                    url=item.get("url", "#"),
                    image=item.get("image", None),
                    published_at=pub_date,
                    author=item.get("author", "Unknown"),
                    category=item.get("category", [])
                ))
            
            # Apply limit per request (not daily limit, but page size)
            start = offset
            end = offset + limit
            return articles[start:end]

        except Exception as e:
            print(f"Search fetch error: {e}")
            return []

    # 2. HANDLE DAILY FEED (Cached, Personalized)
    from app.services.feed import generate_daily_for_user
    
    try:
        # We don't support pagination on the cached feed nicely yet without fetching all.
        # generate_daily_for_user returns the full list (10 or 50).
        # We can slice it here.
        full_feed = await generate_daily_for_user(current_user.id, db)
        
        start = offset
        end = offset + limit
        return full_feed[start:end]
        
    except Exception as e:
        if "limit reached" in str(e).lower():
             raise HTTPException(status_code=429, detail=str(e))
        print(f"Feed error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate feed")


