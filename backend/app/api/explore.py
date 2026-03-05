"""
Public Explore API — no authentication required.

Serves a cached, aggregated news feed for unauthenticated visitors.
"""

import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Query

from app.schemas.news import News as NewsSchema
from app.services.providers.aggregator import news_aggregator

logger = logging.getLogger("app.api.explore")
router = APIRouter()

VALID_CATEGORIES = [
    "general", "technology", "business", "world",
    "science", "health", "politics", "entertainment",
]


@router.get("/feed")
async def explore_feed(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(30, ge=1, le=50),
) -> List[dict]:
    """
    Public news feed — no login required.
    Returns aggregated articles from RSS + GDELT.
    """
    cat = category.lower() if category else None
    if cat and cat not in VALID_CATEGORIES:
        cat = None

    articles = await news_aggregator.fetch_feed(
        category=cat,
        limit=limit,
        use_cache=True,
    )

    return [
        {
            "id": str(uuid.uuid4()),
            "title": a.title,
            "description": a.description,
            "url": a.url,
            "image": a.image,
            "published_at": a.published_at.isoformat(),
            "author": a.author or "Unknown",
            "category": a.tags if a.tags else [a.category] if a.category else [],
            "tags": a.tags if a.tags else [a.category] if a.category else [],
            "sentiment": None,
            "bias_score": None,
            "source_name": a.source_name,
            "source_domain": a.source_domain,
        }
        for a in articles
    ]


@router.get("/categories")
async def explore_categories() -> List[str]:
    """Returns available categories for the explore feed."""
    return VALID_CATEGORIES
