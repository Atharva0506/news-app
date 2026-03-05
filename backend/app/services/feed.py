import logging
from datetime import datetime, timedelta, timezone
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

logger = logging.getLogger("app.services.feed")

from app.models.user import User
from app.models.news import NewsArticle, UserPreference
from app.models.daily_cache import UserDailyCache
from app.schemas.news import News as NewsSchema
from app.services.currents import currents_service

async def generate_daily_for_user(user_id: uuid.UUID, db: AsyncSession, force_refresh: bool = False, is_initial_setup: bool = False) -> List[NewsSchema]:
    """
    Generates or retrieves the daily news feed for a user.
    Enforces daily limits for free users.
    Set is_initial_setup=True during onboarding to bypass limits.
    """
    
    # 1. Fetch User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        return []

    today = datetime.now(timezone.utc).date()
    
    # 2. Check Cache
    cache_query = await db.execute(
        select(UserDailyCache)
        .where(UserDailyCache.user_id == user_id)
    )
    cache_entry = cache_query.scalars().first()
    
    # If valid cache exists and not forcing refresh (or user is free and already has today's feed)
    # Check if cache is still valid
    is_cache_valid = cache_entry and cache_entry.expires_at > datetime.now(timezone.utc)
    
    if is_cache_valid and not force_refresh and not is_initial_setup:
        # Return cached feed
        if cache_entry.news_feed:
            return [NewsSchema(**item) for item in cache_entry.news_feed]

    # 3. Check Limits (Strict for Free Users) — skip during initial setup
    if not user.is_premium and not is_initial_setup:
        # If cache is valid, we already returned it.
        # If cache is invalid or missing, check last refresh date.
        if user.last_news_refresh_date and user.last_news_refresh_date.date() == today:
             # Already refreshed today. 
             # If cache exists (even if technically "expired" or just old logic), return it to avoid API hit?
             # BUT if we are here, is_cache_valid is False or force_refresh is True.
             # If force_refresh is True and user is free -> Block if already refreshed today.
             if force_refresh:
                 raise Exception("Daily refresh limit reached for Free plan.")
             
             # If not force_refresh but cache is missing/expired, we might be in a weird state. 
             # Let's allow one "repair" fetch if cache is excessively old, but generally block.
             # For now, block strict.
             if cache_entry and cache_entry.news_feed:
                  # Fallback to existing cache even if expired?
                  return [NewsSchema(**item) for item in cache_entry.news_feed]
             
             # If no cache and limit reached, maybe return empty list or error?
             # Let's allow generation if NO cache exists (emergency fix).
             pass

    from app.core.plan_checker import check_trial_expiration
    
    # Check trial expiration first
    user = await check_trial_expiration(user, db)

    # 4. Fetch News from Currents
    # Fetch Preferences
    prefs_result = await db.execute(select(UserPreference).where(UserPreference.user_id == user.id))
    prefs = prefs_result.scalars().first()
    
    lang = prefs.language if prefs else "en"
    country = prefs.country if prefs else "us"
    type_map = {"news": 1, "articles": 2, "discussion": 3}
    type_int = type_map.get(prefs.content_type, 1) if prefs else 1
    
    preferred_categories = prefs.favorite_categories if (prefs and prefs.favorite_categories) else []
    # Limit categories based on plan
    max_cats = 5 if user.is_premium else 1
    preferred_categories = preferred_categories[:max_cats]
    
    # Fetch Logic
    # (Simplified from original api/news.py)
    try:
        raw_news = []
        if not preferred_categories:
            raw_news = await currents_service.fetch_latest_news(language=lang, country=country, type_=type_int)
        else:
             if len(preferred_categories) == 1:
                  raw_news = await currents_service.fetch_latest_news(category=preferred_categories[0], language=lang, country=country, type_=type_int)
             else:
                import asyncio
                tasks = [currents_service.fetch_latest_news(category=cat, language=lang, country=country, type_=type_int) for cat in preferred_categories]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for res in results:
                    if isinstance(res, list):
                        raw_news.extend(res)
    except Exception as e:
        logger.error("Feed generation error", exc_info=e)
        return []

    # Deduplicate and Sort
    unique_news = []
    seen = set()
    for item in raw_news:
        uid = item.get("id") or item.get("url")
        if uid and uid not in seen:
            seen.add(uid)
            unique_news.append(item)
    
    def parse_date(x):
        try:
             return datetime.strptime(x.get("published"), "%Y-%m-%d %H:%M:%S %z")
        except:
             return datetime.min.replace(tzinfo=timezone.utc)

    unique_news.sort(key=parse_date, reverse=True)
    
    # 5. Transform
    articles = []
    for item in unique_news:
        pub_date = datetime.now(timezone.utc)
        if item.get("published"):
             try:
                pub_date = datetime.strptime(item.get("published"), "%Y-%m-%d %H:%M:%S %z")
             except: pass
             
        articles.append(NewsSchema(
            id=item.get("id") or str(uuid.uuid4()),
            title=item.get("title", "No Title"),
            description=item.get("description", ""),
            url=item.get("url", "#"),
            image=item.get("image", None),
            published_at=pub_date,
            author=item.get("author", "Unknown"),
            category=item.get("category", []),
            sentiment=None, tags=[], summary_short=None, summary_detail=None, bias_score=None
        ))

    # 6. Apply Limit & Cache
    # User Request: Free and Trial users get 5 news per day. Pro unlimited (or high limit).
    if user.plan_type in ["free", "trial"]:
         articles = articles[:5]
    else:
         articles = articles[:50]

    feed_data = [a.model_dump(mode='json') for a in articles]

    if cache_entry:
        cache_entry.news_feed = feed_data
        cache_entry.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        cache_entry.created_at = datetime.now(timezone.utc)
    else:
        cache_entry = UserDailyCache(
            user_id=user.id,
            news_feed=feed_data,
            summary=None, 
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        db.add(cache_entry)
        
    user.last_news_refresh_date = datetime.now(timezone.utc)
    db.add(user)
    await db.commit()
    
    return articles
