from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class NewsBase(BaseModel):
    title: str
    url: str
    description: Optional[str] = None
    published_at: datetime
    author: Optional[str] = None
    image: Optional[str] = None
    category_id: Optional[int] = None

class NewsCreate(NewsBase):
    content: Optional[str] = None

class News(NewsBase):
    id: UUID | str
    sentiment: Optional[str] = None
    tags: Optional[List[str]] = []
    summary_short: Optional[str] = None
    summary_detail: Optional[str] = None
    bias_score: Optional[float] = None
    bias_explanation: Optional[str] = None # Premium only
    created_at: Optional[datetime] = None
    category: List[str] = [] # Changed from simple category_id

    model_config = ConfigDict(from_attributes=True)

class NewsCategory(BaseModel):
    id: int
    name: str
    
    model_config = ConfigDict(from_attributes=True)

class UserPreferenceBase(BaseModel):
    favorite_categories: List[str] = []
    favorite_keywords: List[str] = []
    summary_style: str = "short"

class UserPreferenceUpdate(UserPreferenceBase):
    pass

class UserPreference(UserPreferenceBase):
    id: UUID
    user_id: UUID
    
    model_config = ConfigDict(from_attributes=True)
