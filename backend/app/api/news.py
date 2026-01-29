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
    from datetime import datetime
    import uuid

    # 1. Determine Fetch Parameters
    fetch_category = category
    fetch_keywords = search

    # 3. Fetch Data Logic
    try:
        if fetch_keywords:
            # Check limits for keywords? Assuming 1 search for now based on first keyword or query
            raw_news = await currents_service.fetch_search_news(keywords=fetch_keywords, category=fetch_category)
        
        elif category:
            # Explicit category request overrides prefs
            raw_news = await currents_service.fetch_latest_news(category=category)
            
        else:
            # Use Preferences
            prefs_result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
            prefs = prefs_result.scalars().first()
            
            preferred_categories = prefs.favorite_categories if (prefs and prefs.favorite_categories) else []
            
            # Limit enforcement (redundant check but safe)
            max_cats = 5 if current_user.is_premium else 1
            preferred_categories = preferred_categories[:max_cats]
            
            if not preferred_categories:
                # No prefs, fetch general
                raw_news = await currents_service.fetch_latest_news()
            else:
                # Fetch all categories
                # Note: This does sequential fetching for simplicity. Parallel gather could be better for perf.
                all_articles = []
                # Use a set to avoid duplicates if API returns overlapping content (unlikely with different cats but possible)
                seen_ids = set()
                
                # Simple optimization: If only 1 category, just fetch it
                if len(preferred_categories) == 1:
                     raw_news = await currents_service.fetch_latest_news(category=preferred_categories[0])
                else:
                    # Parallel fetch is better here
                    import asyncio
                    tasks = [currents_service.fetch_latest_news(category=cat) for cat in preferred_categories]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    raw_news = []
                    for res in results:
                        if isinstance(res, list):
                            raw_news.extend(res)
                        else:
                            print(f"Error fetching category: {res}")
                            
           # Deduplicate based on 'id' if available or 'url'
    except Exception as e:
        print(f"Feed fetch error: {e}")
        raw_news = []

    # Deduplicate mechanism
    unique_news = []
    seen = set()
    for item in raw_news:
        uid = item.get("id") or item.get("url")
        if uid and uid not in seen:
            seen.add(uid)
            unique_news.append(item)
    
    # Sort by published date descending (Mock data might not have dates, so handle safely)
    def parse_date(x):
        try:
             return datetime.strptime(x.get("published"), "%Y-%m-%d %H:%M:%S %z")
        except:
             return datetime.min.replace(tzinfo=None) # Fallback

    unique_news.sort(key=parse_date, reverse=True)
    raw_news = unique_news

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


