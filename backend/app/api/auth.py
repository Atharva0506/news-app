from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.user import Token, UserCreate, User as UserSchema

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "refresh_token": security.create_refresh_token(user.id)
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Refresh access token
    """
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        if not payload.get("refresh"):
            raise HTTPException(status_code=400, detail="Invalid refresh token")
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=400, detail="Invalid refresh token")
    except (JWTError, Exception):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "refresh_token": refresh_token # Return same refresh token? Or rotate? For simplicity return same or new. Rotate is better security.
        # Let's rotate.
        # "refresh_token": security.create_refresh_token(user.id) 
    }

@router.post("/register", response_model=UserSchema)
async def register(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user without the need to be logged in
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )
        
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.get("/me/usage", response_model=dict)
async def read_user_usage(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get user AI usage stats.
    """
    from sqlalchemy import func
    from app.models.payment import AIUsageLog
    from datetime import datetime, timedelta, timezone

    # Total tokens
    result = await db.execute(
        select(func.sum(AIUsageLog.tokens_used)).where(AIUsageLog.user_id == current_user.id)
    )
    total_tokens = result.scalar() or 0

    # Daily tokens (last 24h)
    yesterday = datetime.utcnow() - timedelta(days=1)
    result_daily = await db.execute(
        select(func.sum(AIUsageLog.tokens_used))
        .where(AIUsageLog.user_id == current_user.id)
        .where(AIUsageLog.created_at >= yesterday)
    )
    daily_tokens = result_daily.scalar() or 0
    
    # Request count (total interactions)
    result_count = await db.execute(
        select(func.count(AIUsageLog.id)).where(AIUsageLog.user_id == current_user.id)
    )
    request_count = result_count.scalar() or 0

    today = datetime.now(timezone.utc).date()
    
    news_available = False
    summary_available = False
    
    if current_user.is_premium:
        news_available = current_user.refresh_tokens > 0
        summary_available = current_user.refresh_tokens > 0
    else:
        news_available = not current_user.last_news_refresh_date or current_user.last_news_refresh_date.date() < today
        summary_available = not current_user.last_summary_refresh_date or current_user.last_summary_refresh_date.date() < today

    return {
        "total_tokens": total_tokens,
        "daily_tokens": daily_tokens,
        "request_count": request_count,
        "limit_daily": 10000 if current_user.is_premium else 1000,
        "refresh_tokens": current_user.refresh_tokens,
        "news_refresh_available": news_available,
        "summary_refresh_available": summary_available
    }

@router.delete("/me", status_code=204, response_class=Response)
async def delete_user_me(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Delete own user account and all associated data.
    """
    await db.delete(current_user)
    await db.commit()
    return Response(status_code=204)
