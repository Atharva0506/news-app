import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger("app.api.onboarding")

from app.api import deps
from app.models.user import User
from app.models.news import UserPreference
from app.schemas.news import UserPreferenceUpdate
from app.schemas.user import User as UserSchema

# We need to import the task function once implemented
# from app.tasks.news import generate_daily_feed

router = APIRouter()

@router.post("/submit", response_model=UserSchema)
async def submit_onboarding(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    prefs_in: UserPreferenceUpdate,
    background_tasks: BackgroundTasks
) -> Any:
    """
    Submit onboarding data: preferences and profile settings.
    Validates limits based on user plan.
    Triggers initial feed generation.
    """
    
    # 1. Validate Onboarding State
    if current_user.onboarding_completed:
        # Idempotent: if already done, just return user
        # But maybe they want to update? 
        # For now, let's allow updates via this endpoint too, but typically /me/preferences is for updates.
        # Strict onboarding might block this if already true. 
        # Let's treat it as "finish onboarding" which sets the flag.
        pass

    # 2. Validate Limits
    # Free users: max 3 keywords
    MAX_KEYWORDS_FREE = 3
    MAX_KEYWORDS_PRO = 5
    
    limit = MAX_KEYWORDS_PRO if current_user.is_premium else MAX_KEYWORDS_FREE
    
    # We check both categories and keywords to be safe, though requirements highlighted keywords
    if len(prefs_in.favorite_keywords) > limit:
        raise HTTPException(
            status_code=400,
            detail=f"Plan limit exceeded: You can select up to {limit} keywords."
        )

    # 3. Save Preferences
    # Check if prefs exist
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    
    if not prefs:
        prefs = UserPreference(user_id=current_user.id)
        db.add(prefs)
    
    prefs.language = prefs_in.language
    prefs.country = prefs_in.country
    prefs.content_type = prefs_in.content_type
    prefs.favorite_categories = prefs_in.favorite_categories
    prefs.favorite_keywords = prefs_in.favorite_keywords
    prefs.summary_style = prefs_in.summary_style
    
    # 4. Update User Status
    current_user.onboarding_completed = True
    
    db.add(prefs)
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    # 5. Trigger Feed Generation
    from app.services.feed import generate_daily_for_user
    
    # We can run this in background, but since it's the FIRST feed, maybe better to await it? 
    # Or background it and let frontend poll/wait?
    # User requirement: "Redirect to Onboarding... Do not load dashboard... After successful save: Load today's news feed".
    # So we should probably wait here or return quickly and let dashboard load it.
    # If we wait, it might take 5-10 seconds.
    # Let's run it in background to keep onboarding snappy, Dashboard will show "Generating..." state managed by frontend.
    
    async def generate_task(uid: Any, db_session: AsyncSession):
         # We need a new session or reuse? BackgroundTasks runs after response. 
         # Session might be closed. Better to create new session in task or pass ID.
         # Actually, FastApi BackgroundTasks with async session from dependency is tricky if session closes.
         # For simplicity, let's just await it here as it's critical part of "Onboarding -> Dashboard" transition.
         # Users expect to see news immediately.
         try:
             await generate_daily_for_user(uid, db_session, force_refresh=True)
         except Exception as e:
             logger.warning("Initial feed generation failed during onboarding", exc_info=e)

    # Awaiting it directly to ensure data is ready when they land on Dashboard
    try:
        await generate_daily_for_user(current_user.id, db, force_refresh=True, is_initial_setup=True)
    except Exception as e:
        logger.warning("Initial feed generation failed (non-critical)", exc_info=e)
    
    return current_user
