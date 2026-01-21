from pydantic import BaseModel

class UserPreferenceOut(BaseModel):
    preferred_categories: list[str] = []
    preferred_keywords: list[str] = []

class UserPreferenceIn(BaseModel):
    preferred_categories: list[str] = []
    preferred_keywords: list[str] = []
