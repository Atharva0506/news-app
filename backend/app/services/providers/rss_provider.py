"""
RSS Feed Provider — unlimited, free, primary news source.

Fetches from BBC, NPR, TechCrunch, Ars Technica, The Verge, and more.
Uses httpx for async HTTP + feedparser for XML parsing.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

import feedparser
import httpx

from app.services.providers import ArticleResult, BaseNewsProvider

logger = logging.getLogger("app.services.providers.rss")

# ── Feed Registry ────────────────────────────────────────────────────────
# Maps category → list of (feed_url, source_name)
RSS_FEEDS: Dict[str, List[Tuple[str, str]]] = {
    "general": [
        ("http://feeds.bbci.co.uk/news/rss.xml", "BBC News"),
        ("https://feeds.npr.org/1001/rss.xml", "NPR"),
    ],
    "world": [
        ("http://feeds.bbci.co.uk/news/world/rss.xml", "BBC World"),
        ("https://feeds.npr.org/1004/rss.xml", "NPR World"),
    ],
    "technology": [
        ("http://feeds.bbci.co.uk/news/technology/rss.xml", "BBC Tech"),
        ("https://techcrunch.com/feed/", "TechCrunch"),
        ("https://feeds.arstechnica.com/arstechnica/index", "Ars Technica"),
        ("https://www.theverge.com/rss/index.xml", "The Verge"),
    ],
    "business": [
        ("http://feeds.bbci.co.uk/news/business/rss.xml", "BBC Business"),
        ("https://feeds.npr.org/1006/rss.xml", "NPR Business"),
    ],
    "science": [
        ("http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", "BBC Science"),
        ("https://feeds.npr.org/1007/rss.xml", "NPR Science"),
        ("https://feeds.arstechnica.com/arstechnica/science", "Ars Science"),
    ],
    "health": [
        ("http://feeds.bbci.co.uk/news/health/rss.xml", "BBC Health"),
        ("https://feeds.npr.org/1128/rss.xml", "NPR Health"),
    ],
    "politics": [
        ("https://feeds.npr.org/1014/rss.xml", "NPR Politics"),
    ],
    "entertainment": [
        ("http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "BBC Entertainment"),
    ],
}


def _struct_to_datetime(t) -> datetime:
    """Convert a feedparser time.struct_time to a timezone-aware datetime."""
    if t is None:
        return datetime.now(timezone.utc)
    try:
        return datetime(*t[:6], tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def _extract_image(entry: dict) -> Optional[str]:
    """Attempt to pull an image URL from an RSS entry."""
    # media:thumbnail / media:content
    media = entry.get("media_thumbnail") or entry.get("media_content")
    if media and isinstance(media, list) and media[0].get("url"):
        return media[0]["url"]

    # enclosures
    for enc in entry.get("enclosures", []):
        if enc.get("type", "").startswith("image") and enc.get("href"):
            return enc["href"]

    # links with image type
    for link in entry.get("links", []):
        if link.get("type", "").startswith("image") and link.get("href"):
            return link["href"]

    return None


class RSSProvider(BaseNewsProvider):
    """Fetches news from RSS feeds with async HTTP + feedparser parsing."""

    def __init__(self):
        # ETag / Last-Modified cache per feed URL  →  { url: (etag, modified) }
        self._etag_cache: Dict[str, Tuple[Optional[str], Optional[str]]] = {}

    async def _fetch_feed(
        self, client: httpx.AsyncClient, url: str, source_name: str, category: str
    ) -> List[ArticleResult]:
        """Fetch & parse a single RSS feed asynchronously."""
        headers: Dict[str, str] = {"User-Agent": "NewsAI/2.0 (+https://newsai.atharvanaik.me)"}

        # Conditional request
        cached = self._etag_cache.get(url)
        if cached:
            etag, modified = cached
            if etag:
                headers["If-None-Match"] = etag
            if modified:
                headers["If-Modified-Since"] = modified

        try:
            resp = await client.get(url, headers=headers, timeout=12.0, follow_redirects=True)

            if resp.status_code == 304:
                return []  # not modified

            if resp.status_code >= 400:
                logger.warning("RSS %s returned %d", url, resp.status_code)
                return []

            # Store etag/last-modified for next poll
            self._etag_cache[url] = (
                resp.headers.get("ETag"),
                resp.headers.get("Last-Modified"),
            )

            d = feedparser.parse(resp.text)
        except Exception as exc:
            logger.warning("RSS fetch error for %s: %s", url, exc)
            return []

        domain = urlparse(url).netloc
        articles: List[ArticleResult] = []

        for entry in d.entries:
            pub = _struct_to_datetime(entry.get("published_parsed") or entry.get("updated_parsed"))
            tags = [t.get("term", "") for t in entry.get("tags", []) if t.get("term")]

            articles.append(
                ArticleResult(
                    title=entry.get("title", "").strip(),
                    url=entry.get("link", ""),
                    description=(entry.get("summary") or entry.get("description") or "").strip(),
                    image=_extract_image(entry),
                    published_at=pub,
                    author=entry.get("author"),
                    source_name=source_name,
                    source_domain=domain,
                    category=category,
                    tags=tags,
                )
            )

        return articles

    # ── Public interface ──────────────────────────────────────────────────

    async def fetch_articles(
        self,
        category: Optional[str] = None,
        language: str = "en",
        country: str = "us",
        limit: int = 20,
    ) -> List[ArticleResult]:
        import asyncio

        cat = (category or "general").lower()
        feeds = RSS_FEEDS.get(cat, RSS_FEEDS["general"])

        async with httpx.AsyncClient() as client:
            tasks = [self._fetch_feed(client, url, name, cat) for url, name in feeds]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        articles: List[ArticleResult] = []
        for res in results:
            if isinstance(res, list):
                articles.extend(res)

        # Sort newest-first, apply limit
        articles.sort(key=lambda a: a.published_at, reverse=True)
        return articles[:limit]

    async def search_articles(
        self, query: str, language: str = "en", limit: int = 20
    ) -> List[ArticleResult]:
        """Search across all feeds by matching title/description (RSS has no server-side search)."""
        import asyncio

        q = query.lower()
        all_feeds = [(url, name, cat) for cat, feeds in RSS_FEEDS.items() for url, name in feeds]

        async with httpx.AsyncClient() as client:
            tasks = [self._fetch_feed(client, url, name, cat) for url, name, cat in all_feeds]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        articles: List[ArticleResult] = []
        for res in results:
            if isinstance(res, list):
                for a in res:
                    if q in a.title.lower() or q in a.description.lower():
                        articles.append(a)

        articles.sort(key=lambda a: a.published_at, reverse=True)
        return articles[:limit]


rss_provider = RSSProvider()
