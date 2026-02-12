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
    refresh: bool = False,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    from app.models.news import UserPreference
    from app.services.news_service import news_service
    
    prefs_result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = prefs_result.scalars().first()

    if refresh:
        await news_service.fetch_and_store_news(db, prefs)
    
    articles = await news_service.get_user_feed_from_db(
        db, 
        prefs, 
        limit=limit, 
        offset=offset,
        category=category,
        sentiment=sentiment,
        search=search
    )
    
    if not articles and not refresh and not category and not search:
         await news_service.fetch_and_store_news(db, prefs)
         articles = await news_service.get_user_feed_from_db(db, prefs, limit=limit, offset=offset)

    return articles


