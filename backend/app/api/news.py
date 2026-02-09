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

    if not category and not search and not current_user.is_premium:
        existing_cache = await db.execute(
            select(UserDailyCache)
            .where(UserDailyCache.user_id == current_user.id)
            .where(UserDailyCache.expires_at > datetime.now(timezone.utc))
        )
        cache_entry = existing_cache.scalars().first()
        
        if cache_entry and cache_entry.news_feed:
            return [NewsSchema(**item) for item in cache_entry.news_feed]

    # Rate Limiting for Free Users on Search/Category or forced refresh
    if not current_user.is_premium and (category or search):
         # Check if they hit daily limit for API calls (different from AI limit, but let's reuse AIUsageLog with 'news_search' action)
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

    fetch_category = category
    fetch_keywords = search
    # Load User Preferences once
    prefs_result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = prefs_result.scalars().first()
    
    lang = prefs.language if prefs else "en"
    country = prefs.country if prefs else "us"
    type_map = {"news": 1, "articles": 2, "discussion": 3}
    type_int = type_map.get(prefs.content_type, 1) if prefs else 1

    try:
        raw_news = []
        if fetch_keywords:
            raw_news = await currents_service.fetch_search_news(
                keywords=fetch_keywords, 
                category=fetch_category,
                language=lang, 
                country=country, 
                type_=type_int
            )
        
        else:
            # No search, check category or preferences
            if fetch_category:
                 # Explicit category requested
                 raw_news = await currents_service.fetch_latest_news(
                     category=fetch_category,
                     language=lang, 
                     country=country, 
                     type_=type_int
                 )
            
            else:
                # Use User Preferences for categories
                preferred_categories = prefs.favorite_categories if (prefs and prefs.favorite_categories) else []
                
                # Limit categories based on plan
                max_cats = 5 if current_user.is_premium else 1
                preferred_categories = preferred_categories[:max_cats]
                
                if not preferred_categories:
                    raw_news = await currents_service.fetch_latest_news(language=lang, country=country, type_=type_int)
                else:
                    if len(preferred_categories) == 1:
                         raw_news = await currents_service.fetch_latest_news(category=preferred_categories[0], language=lang, country=country, type_=type_int)
                    else:
                        import asyncio
                        tasks = [currents_service.fetch_latest_news(category=cat, language=lang, country=country, type_=type_int) for cat in preferred_categories]
                        results = await asyncio.gather(*tasks, return_exceptions=True)
                        
                        raw_news = []
                        for res in results:
                            if isinstance(res, list):
                                raw_news.extend(res)
                            else:
                                print(f"Error fetching category: {res}")

        # Log usage for Free users if search/category
        if not current_user.is_premium and (category or search):
             from app.models.payment import AIUsageLog
             # Deduplicate log check? We checked rate limit at top. This is just recording usage.
             log = AIUsageLog(
                 user_id=current_user.id,
                 action="news_search",
                 tokens_used=0 
             )
             db.add(log)
             await db.commit()

    except Exception as e:
        print(f"Feed fetch error: {e}")
        raw_news = []

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
             return datetime.min.replace(tzinfo=timezone.utc) # Fallback

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
            id=item.get("id") or str(uuid.uuid4()),
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
         
         # SAVE TO CACHE
         from datetime import timedelta
         
         # Convert to dict for JSON storage
         feed_data = [a.model_dump(mode='json') for a in articles]
         
         # Check if update or insert needed (we upsert logic essentially)
         # We already queried cache_entry at top. If it exists but news_feed was empty/expired (unlikely given query), or need new.
         # Actually we queried for *valid* cache. If we are here, valid cache didn't exist.
         # So we check if ANY row exists to update, or create new.
         
         cache_check = await db.execute(select(UserDailyCache).where(UserDailyCache.user_id == current_user.id))
         user_cache = cache_check.scalars().first()
         
         if user_cache:
             user_cache.news_feed = feed_data
             user_cache.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
             user_cache.created_at = datetime.now(timezone.utc) # Refresh created_at
         else:
             user_cache = UserDailyCache(
                 user_id=current_user.id,
                 news_feed=feed_data,
                 summary=None, # Keep existing or None? If new, None. 
                 expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
             )
             db.add(user_cache)
             
         # Update User's last refresh date so Frontend knows to disable button
         current_user.last_news_refresh_date = datetime.now(timezone.utc)
         db.add(current_user)
             
         await db.commit()

    else:
         # Pagination simulation
         start = offset
         end = offset + limit
         articles = articles[start:end]

    return articles


