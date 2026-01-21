from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.news import UserPreference
from app.schemas.user import UserPreferenceOut, UserPreferenceIn

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/preferences", response_model=UserPreferenceOut)
async def get_prefs(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    pref = (await db.execute(select(UserPreference).where(UserPreference.user_id == user.id))).scalar_one_or_none()
    if not pref:
        return UserPreferenceOut()
    return UserPreferenceOut(preferred_categories=pref.preferred_categories, preferred_keywords=pref.preferred_keywords)

@router.put("/preferences", response_model=UserPreferenceOut)
async def put_prefs(data: UserPreferenceIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    pref = (await db.execute(select(UserPreference).where(UserPreference.user_id == user.id))).scalar_one_or_none()
    if not pref:
        pref = UserPreference(user_id=user.id, preferred_categories=data.preferred_categories, preferred_keywords=data.preferred_keywords)
        db.add(pref)
    else:
        pref.preferred_categories = data.preferred_categories
        pref.preferred_keywords = data.preferred_keywords
    await db.commit()
    return UserPreferenceOut(preferred_categories=pref.preferred_categories, preferred_keywords=pref.preferred_keywords)
