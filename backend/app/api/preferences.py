from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.user import User
from app.models.news import UserPreference
from app.schemas.news import UserPreference as UserPreferenceSchema, UserPreferenceUpdate

router = APIRouter()

@router.get("/me", response_model=UserPreferenceSchema)
async def get_user_preferences(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get current user's preferences
    """
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    
    if not prefs:
        # Create default
        prefs = UserPreference(user_id=current_user.id, favorite_categories=[], favorite_keywords=[])
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
        
    return prefs

@router.put("/me", response_model=UserPreferenceSchema)
async def update_user_preferences(
    prefs_in: UserPreferenceUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update user preferences
    """
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    
    if not prefs:
        prefs = UserPreference(user_id=current_user.id)
        db.add(prefs)
    
    # Update fields
    prefs.favorite_categories = prefs_in.favorite_categories
    prefs.favorite_keywords = prefs_in.favorite_keywords
    prefs.summary_style = prefs_in.summary_style
    
    db.add(prefs)
    await db.commit()
    await db.refresh(prefs)
    return prefs
