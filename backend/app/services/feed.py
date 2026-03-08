import logging
from datetime import datetime, timedelta, timezone
import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger("app.services.feed")

from app.models.user import User
from app.models.news import UserPreference
from app.models.daily_cache import UserDailyCache
from app.schemas.news import News as NewsSchema
from app.services.providers.aggregator import news_aggregator

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

    # 3. Skip Limits (We want unlimited refresh)
    # Allows generation if cache exists or user forces refresh

    from app.core.plan_checker import check_trial_expiration

    # Check trial expiration first
    user = await check_trial_expiration(user, db)

    # 4. Fetch News from Provider
    # Fetch Preferences
    prefs_result = await db.execute(select(UserPreference).where(UserPreference.user_id == user.id))
    prefs = prefs_result.scalars().first()

    lang = prefs.language if prefs else "en"
    country = prefs.country if prefs else "us"
    type_map = {"news": 1, "articles": 2, "discussion": 3}
    type_int = type_map.get(prefs.content_type, 1) if prefs else 1

    preferred_categories = prefs.favorite_categories if (prefs and prefs.favorite_categories) else []
    # Limit categories for all users
    max_cats = 5
    preferred_categories = preferred_categories[:max_cats]

    # Fetch Logic — use RSS aggregator
    try:
        import asyncio

        aggregated = []
        if not preferred_categories:
            aggregated = await news_aggregator.fetch_feed(
                language=lang, country=country, limit=25, use_cache=False
            )
        else:
            tasks = [
                news_aggregator.fetch_feed(category=cat, language=lang, country=country, limit=5, use_cache=False)
                for cat in preferred_categories
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, list):
                    aggregated.extend(res)

        if not aggregated:
            logger.warning("Aggregator returned 0 articles for user %s", user_id)
    except Exception as e:
        logger.error("Feed generation error", exc_info=e)
        return []

    # Deduplicate by URL
    seen: set = set()
    unique_articles = []
    for a in aggregated:
        if a.url not in seen:
            seen.add(a.url)
            unique_articles.append(a)

    unique_articles.sort(key=lambda a: a.published_at, reverse=True)

    # 5. Transform to schema
    articles = []
    for item in unique_articles:
        articles.append(NewsSchema(
            id=str(uuid.uuid4()),
            title=item.title,
            description=item.description,
            url=item.url,
            image=item.image,
            published_at=item.published_at,
            author=item.author or "Unknown",
            category=item.tags if item.tags else [item.category] if item.category else [],
            sentiment=None, tags=item.tags if item.tags else [item.category] if item.category else [],
            summary_short=None, summary_detail=None, bias_score=None,
            source_name=item.source_name,
        ))

    # 6. Apply Limit & Cache
    # Unlimited refresh for news feed, returning up to 50 items.
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
