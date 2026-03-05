from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.schemas.news import News as NewsSchema

router = APIRouter()

@router.get("/feed", response_model=List[NewsSchema])
async def get_news_feed(
    db: AsyncSession = Depends(deps.get_db),
    limit: int = 50,
    offset: int = 0,
    refresh: bool = False,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    Returns the user's daily news feed.
    Uses the RSS + GDELT aggregator with DB-level caching (UserDailyCache).
    """
    from app.services.feed import generate_daily_for_user

    try:
        articles = await generate_daily_for_user(
            user_id=current_user.id,
            db=db,
            force_refresh=refresh,
        )
    except Exception as e:
        msg = str(e)
        if "limit" in msg.lower():
            raise HTTPException(status_code=403, detail=msg)
        raise HTTPException(status_code=500, detail="Failed to generate feed")

    # Apply client-side filters on top of cached feed
    if category and category.lower() not in ("all", "all categories"):
        articles = [
            a for a in articles
            if category.lower() in [t.lower() for t in (a.tags or a.category or [])]
        ]

    if sentiment and sentiment.lower() not in ("all", "all-sentiment"):
        articles = [a for a in articles if a.sentiment and a.sentiment.lower() == sentiment.lower()]

    if search:
        q = search.lower()
        articles = [a for a in articles if q in (a.title or "").lower() or q in (a.description or "").lower()]

    return articles[offset : offset + limit]


