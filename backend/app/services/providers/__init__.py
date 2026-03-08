"""
Multi-source news provider abstraction.

Supports:
- RSS feeds (BBC, NPR, TechCrunch, Ars Technica, The Verge, etc.)
- GDELT Project API (global news coverage)
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional
from abc import ABC, abstractmethod


@dataclass
class ArticleResult:
    """Unified article format returned by all providers."""
    title: str
    url: str
    description: str = ""
    image: Optional[str] = None
    published_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    author: Optional[str] = None
    source_name: str = ""
    source_domain: str = ""
    category: str = "general"
    language: str = "en"
    country: str = "us"
    content: Optional[str] = None
    tags: List[str] = field(default_factory=list)


class BaseNewsProvider(ABC):
    """Abstract base for all news providers."""

    @abstractmethod
    async def fetch_articles(
        self,
        category: Optional[str] = None,
        language: str = "en",
        country: str = "us",
        limit: int = 20,
    ) -> List[ArticleResult]:
        """Fetch articles, optionally filtered by category."""
        ...

    @abstractmethod
    async def search_articles(
        self,
        query: str,
        language: str = "en",
        limit: int = 20,
    ) -> List[ArticleResult]:
        """Search articles by keyword."""
        ...
