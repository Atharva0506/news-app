from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

from app.schemas.news import UserPreference

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: UUID
    is_premium: bool
    premium_expiry: Optional[datetime] = None

    # Plan & Trial
    plan_type: str = "free"
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None

    # Usage Limits
    deep_analysis_count: int = 0
    deep_analysis_last_reset: Optional[datetime] = None

    # Legacy / Other Limits
    refresh_tokens: int = 0
    last_news_refresh_date: Optional[datetime] = None
    last_summary_refresh_date: Optional[datetime] = None
    onboarding_completed: bool = False
    is_verified: bool = False

    # Account Metadata
    created_at: Optional[datetime] = None

    # Relationships
    preferences: Optional[UserPreference] = None

    model_config = ConfigDict(from_attributes=True)


class User(UserInDBBase):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
