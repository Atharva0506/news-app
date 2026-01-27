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
    limit: int = 20,
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
    from datetime import datetime
    import uuid

    # 1. Determine Fetch Parameters
    fetch_category = category
    fetch_keywords = search

    # 2. Apply User Preferences as Default 
    if not category and not search:
        prefs_result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
        prefs = prefs_result.scalars().first()
        
        if prefs and prefs.favorite_categories:
            # Use the first category as primary filter for simplicity with Currents API (filtering by 1 supported)
            # Or iterate? Currents API supports comma separated? It seems to support one 'category' param usually or multiple?
            # Safe bet: use the first one.
            fetch_category = prefs.favorite_categories[0]
            
    # 3. Fetch Data
    try:
        if fetch_keywords:
            raw_news = await currents_service.fetch_search_news(keywords=fetch_keywords, category=fetch_category)
        else:
            raw_news = await currents_service.fetch_latest_news(category=fetch_category)
    except Exception as e:
        print(f"Feed fetch error: {e}")
        raw_news = []

    # 4. Filter by Sentiment (Client side filtering essentially, since API might not support it perfectly or we use local NLP)
    # Since we are stateless, we can't easily filter by sentiment without analyzing first. 
    # Current implementation of `fetch` returns raw dicts. 
    # If user asks for sentiment, we might have to skip it or return all.
    # We'll skip complex sentiment filtering here to keep it fast/stateless as requested.

    # 5. Transform to Schema
    articles = []
    for item in raw_news:
        # Map fields
        # Published at handling
        pub_date = datetime.now()
        if item.get("published"):
             try:
                # 2024-01-27 10:00:00 +0000
                pub_date = datetime.strptime(item.get("published"), "%Y-%m-%d %H:%M:%S %z")
             except:
                pass
                
        article = NewsSchema(
            id=item.get("id") or str(uuid.uuid4()), # Use API ID or generate one
            title=item.get("title", "No Title"),
            description=item.get("description", ""),
            url=item.get("url", "#"),
            image=item.get("image", None),
            published_at=pub_date,
            author=item.get("author", "Unknown"),
            category=item.get("category", []),
            # Defaults
            sentiment=None,
            tags=[],
            summary_short=None,
            summary_detail=None,
            bias_score=None
        )
        articles.append(article)

    # 6. Apply Limits (Free vs Premium)
    if isinstance(current_user, User) and not current_user.is_premium:
         articles = articles[:2]
    else:
         # Pagination simulation
         start = offset
         end = offset + limit
         articles = articles[start:end]

    return articles

@router.post("/refresh")
async def refresh_news(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Trigger background news fetch (Stateless: No-op essentially, frontend should just call feed)
    """
    # for stateless content, refresh just means "call likely from frontend again".
    # We can return success.
    return {"message": "Feed refreshed"}

@router.get("/{id}", response_model=NewsSchema)
async def get_article(
    id: str,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Get specific article. 
    WARNING: In stateless mode, we cannot fetch by ID easily if not persisted.
    For now, return 404 or try to fetch (unreliable).
    """
    raise HTTPException(status_code=404, detail="Article storage is disabled. Please access via Feed.")
