from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class NewsArticleOut(BaseModel):
    id: str
    title: str
    url: str
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    raw_payload: dict

class NewsRefreshIn(BaseModel):
    category: str | None = None
    keyword: str | None = None
