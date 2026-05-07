"""
News Aggregator — combines RSS + GDELT into a single feed.

Features:
- Deduplication by URL
- In-memory TTL cache for public explore feed (15 min)
- Category-based routing
- Configurable source priority
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from urllib.parse import urlparse

from app.services.providers import ArticleResult
from app.services.providers.rss_provider import rss_provider

logger = logging.getLogger("app.services.providers.aggregator")

# ── In-memory TTL cache ──────────────────────────────────────────────────
_cache: Dict[str, tuple] = {}  # key → (articles, timestamp)
CACHE_TTL = 15 * 60  # 15 minutes


def _cache_key(category: Optional[str], language: str) -> str:
    return f"{category or 'all'}:{language}"


def _normalize_url(url: str) -> str:
    """Extract domain+path for dedup (ignores query params & fragment)."""
    parsed = urlparse(url)
    return f"{parsed.netloc}{parsed.path}".rstrip("/").lower()


def _deduplicate(articles: List[ArticleResult]) -> List[ArticleResult]:
    seen: set = set()
    unique: List[ArticleResult] = []
    for a in articles:
        key = _normalize_url(a.url)
        if key not in seen:
            seen.add(key)
            unique.append(a)
    return unique


class NewsAggregator:
    """Combines multiple providers into a single ranked feed."""

    async def fetch_feed(
        self,
        category: Optional[str] = None,
        language: str = "en",
        country: str = "us",
        limit: int = 30,
        use_cache: bool = True,
    ) -> List[ArticleResult]:
        key = _cache_key(category, language)

        # Check cache
        if use_cache and key in _cache:
            articles, ts = _cache[key]
            if time.time() - ts < CACHE_TTL:
                logger.debug("Cache HIT for %s", key)
                return articles[:limit]

        # Fetch from RSS provider
        try:
            all_articles = await asyncio.wait_for(
                rss_provider.fetch_articles(category=category, language=language, country=country, limit=limit),
                timeout=15.0
            )
        except asyncio.TimeoutError:
            logger.warning("Provider timeout fetching articles for %s", key)
            all_articles = []
        except Exception as res:
            logger.warning("Provider error: %s", res)
            all_articles = []

        # Deduplicate & sort by recency
        unique = _deduplicate(all_articles)
        unique.sort(key=lambda a: a.published_at, reverse=True)
        feed = unique[:limit]

        # Update cache
        _cache[key] = (feed, time.time())
        logger.info("Aggregated %d articles for %s (deduped from %d)", len(feed), key, len(all_articles))

        return feed

    async def search(
        self,
        query: str,
        language: str = "en",
        limit: int = 20,
    ) -> List[ArticleResult]:
        try:
            all_articles = await asyncio.wait_for(
                rss_provider.search_articles(query=query, language=language, limit=limit),
                timeout=15.0
            )
        except asyncio.TimeoutError:
            logger.warning("Provider timeout searching articles for query: %s", query)
            all_articles = []
        except Exception as res:
            logger.warning("Provider error: %s", res)
            all_articles = []

        unique = _deduplicate(all_articles)
        unique.sort(key=lambda a: a.published_at, reverse=True)
        return unique[:limit]

    def invalidate_cache(self, category: Optional[str] = None, language: str = "en"):
        key = _cache_key(category, language)
        _cache.pop(key, None)


news_aggregator = NewsAggregator()
