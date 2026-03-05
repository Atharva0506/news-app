"""
GDELT Project Provider — free global news coverage.

Uses the GDELT DOC 2.0 API (https://api.gdeltproject.org/api/v2/doc/doc)
to supplement RSS feeds with worldwide coverage.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

from app.services.providers import ArticleResult, BaseNewsProvider

logger = logging.getLogger("app.services.providers.gdelt")

GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"

# Map app categories → GDELT theme keywords
CATEGORY_QUERIES: Dict[str, str] = {
    "general": "",  # no filter — top news
    "technology": "theme:TECH OR domain:techcrunch.com OR domain:theverge.com",
    "business": "theme:ECON OR theme:BUSINESS",
    "world": "sourcecountry:UK OR sourcecountry:IN OR sourcecountry:AU",
    "science": "theme:ENV OR theme:SCIENCE",
    "health": "theme:HEALTH",
    "politics": "theme:POLITICS OR theme:ELECTION",
    "entertainment": "theme:ENTERTAINMENT OR theme:MEDIA",
}

# Rate-limit guard: minimum seconds between requests
_MIN_INTERVAL = 2.0
_last_request_time: float = 0.0


class GDELTProvider(BaseNewsProvider):
    """Fetches articles from the GDELT DOC 2.0 API (JSON mode)."""

    async def _query(
        self,
        query: str,
        timespan: str = "1d",
        max_records: int = 30,
    ) -> List[ArticleResult]:
        global _last_request_time

        # Throttle
        now = asyncio.get_event_loop().time()
        wait = _MIN_INTERVAL - (now - _last_request_time)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_request_time = asyncio.get_event_loop().time()

        params = {
            "query": query or "news",
            "mode": "ArtList",
            "format": "JSON",
            "timespan": timespan,
            "maxrecords": str(max_records),
            "sort": "DateDesc",
        }

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(GDELT_API, params=params, timeout=15.0)
                if resp.status_code == 429:
                    logger.warning("GDELT rate-limited (429)")
                    return []
                if resp.status_code >= 400:
                    logger.warning("GDELT returned %d", resp.status_code)
                    return []

                data = resp.json()
        except Exception as exc:
            logger.warning("GDELT fetch error: %s", exc)
            return []

        raw_articles = data.get("articles", [])
        results: List[ArticleResult] = []

        for item in raw_articles:
            url = item.get("url", "")
            if not url:
                continue

            seen_date = item.get("seendate", "")
            pub = datetime.now(timezone.utc)
            if seen_date:
                try:
                    pub = datetime.strptime(seen_date, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
                except Exception:
                    pass

            domain = urlparse(url).netloc.replace("www.", "")

            results.append(
                ArticleResult(
                    title=item.get("title", "").strip(),
                    url=url,
                    description="",  # GDELT ArtList doesn't provide descriptions
                    image=item.get("socialimage") or None,
                    published_at=pub,
                    source_name=item.get("domain", domain),
                    source_domain=domain,
                    language=item.get("language", "English"),
                    country=item.get("sourcecountry", ""),
                )
            )

        return results

    # ── Public interface ──────────────────────────────────────────────────

    async def fetch_articles(
        self,
        category: Optional[str] = None,
        language: str = "en",
        country: str = "us",
        limit: int = 20,
    ) -> List[ArticleResult]:
        cat = (category or "general").lower()
        query = CATEGORY_QUERIES.get(cat, "")

        # Append language & source country filters
        if language and language != "en":
            query += f" sourcelang:{language}"

        articles = await self._query(query=query, max_records=min(limit, 50))

        # Tag with category
        for a in articles:
            a.category = cat

        return articles[:limit]

    async def search_articles(
        self, query: str, language: str = "en", limit: int = 20
    ) -> List[ArticleResult]:
        return await self._query(query=query, max_records=min(limit, 50))


gdelt_provider = GDELTProvider()
