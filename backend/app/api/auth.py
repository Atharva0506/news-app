from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.email import EmailService
from app.models.user import User
from app.schemas.user import Token, UserCreate, User as UserSchema
import secrets
from datetime import timezone


router = APIRouter()

@router.get("/feature-flags")
async def get_feature_flags() -> Any:
    """
    Get backend feature flags status
    """
    return {
        "email_verification": settings.ENABLE_EMAIL_VERIFICATION,
        "forgot_password": settings.ENABLE_FORGOT_PASSWORD
    }

@router.post("/verify-email")
async def verify_email(
    token: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Verify email with token.
    """
    if not settings.ENABLE_EMAIL_VERIFICATION:
        raise HTTPException(status_code=400, detail="Email verification is disabled")

    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
        
    user.is_verified = True
    user.verification_token = None
    db.add(user)
    await db.commit()
    return {"message": "Email verified successfully"}

@router.post("/resend-verification")
async def resend_verification(
    current_user: User = Depends(deps.get_current_active_user),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Resend verification email to current user.
    """
    if not settings.ENABLE_EMAIL_VERIFICATION:
        raise HTTPException(status_code=400, detail="Email verification is disabled")

    if current_user.is_verified:
        return {"message": "Email already verified"}
        
    # Generate new token
    verification_token = secrets.token_urlsafe(32)
    current_user.verification_token = verification_token
    db.add(current_user)
    await db.commit()
    
    background_tasks.add_task(EmailService.send_verification_email, current_user.email, verification_token)
    return {"message": "Verification email sent"}

@router.post("/forgot-password")
async def forgot_password(
    email: str = Body(..., embed=True),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Trigger password reset email.
    """
    if not settings.ENABLE_FORGOT_PASSWORD:
        raise HTTPException(status_code=400, detail="Forgot password feature is disabled")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_password_token = token
        user.reset_password_expires = datetime.now() + timedelta(hours=1)
        db.add(user)
        await db.commit()
        
        background_tasks.add_task(EmailService.send_password_reset_email, user.email, token)
        
    # Always return success to prevent email enumeration
    return {"message": "If an account exists, a reset link has been sent."}

@router.post("/reset-password")
async def reset_password(
    token: str = Body(...),
    new_password: str = Body(...),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Reset password with token.
    """
    if not settings.ENABLE_FORGOT_PASSWORD:
        raise HTTPException(status_code=400, detail="Forgot password feature is disabled")

    result = await db.execute(select(User).where(User.reset_password_token == token))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    if user.reset_password_expires and datetime.now(user.reset_password_expires.tzinfo) > user.reset_password_expires:
         raise HTTPException(status_code=400, detail="Token expired")
         
    user.hashed_password = security.get_password_hash(new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    db.add(user)
    await db.commit()
    
    return {"message": "Password reset successfully"}

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
    new_refresh_token = security.create_refresh_token(user.id)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "refresh_token": new_refresh_token 
    }

@router.post("/register", response_model=UserSchema)
async def register(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate,
    background_tasks: BackgroundTasks
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
        
    verification_token = secrets.token_urlsafe(32)
    
    # Initialize logic for 3-Day Free Trial
    now = datetime.now(timezone.utc)
    trial_days = 3
    trial_end = now + timedelta(days=trial_days)
    
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        verification_token=verification_token,
        is_verified=not settings.ENABLE_EMAIL_VERIFICATION, # Auto-verify if disabled

        
        # Trial Initialization
        plan_type="trial",
        trial_start_date=now,

        trial_end_date=trial_end,
        is_premium=True, # Enable Pro features during trial
        premium_expiry=trial_end,
        
        # Limits
        deep_analysis_count=0
    )
    db.add(user)
    await db.commit()
    await db.refresh(user) # Get ID after commit
    
    # Eager load preferences to avoid MissingGreenlet error on Pydantic validation
    # user.preferences is not loaded by default and accessing it triggers lazy load which fails in async
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User).options(selectinload(User.preferences)).where(User.id == user.id)
    )
    user = result.scalars().first()
    
    if settings.ENABLE_EMAIL_VERIFICATION:
        background_tasks.add_task(EmailService.send_verification_email, user.email, verification_token)

    
    return user

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.put("/me", response_model=UserSchema)
async def update_user_me(
    *,
    db: AsyncSession = Depends(deps.get_db),
    password: str = Body(None),
    full_name: str = Body(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update own user (full_name, password).
    """
    current_user_data = current_user.model_dump()
    user_in = {}
    if password is not None:
        user_in["password"] = password
    if full_name is not None:
        user_in["full_name"] = full_name

    if user_in:
        # Update user attributes
        if "password" in user_in:
            hashed_password = security.get_password_hash(user_in["password"])
            current_user.hashed_password = hashed_password
        if "full_name" in user_in:
            current_user.full_name = user_in["full_name"]
        
        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)
    
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
    from app.core.plan_checker import check_trial_expiration, _get_deep_analysis_limit

    # Ensure trial status is up to date
    current_user = await check_trial_expiration(current_user, db)

    plan = current_user.plan_type  # "free", "trial", or "pro"

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
    
    # Token limits per plan
    if plan == "pro":
        limit_daily = 10000
    elif plan == "trial":
        limit_daily = 10000
    else:
        limit_daily = 1000

    # News/summary refresh availability
    if plan == "pro":
        news_available = True
        summary_available = True
    elif plan == "trial":
        news_available = True
        summary_available = True
    else:
        # Free: 1 per day each
        news_available = not current_user.last_news_refresh_date or current_user.last_news_refresh_date.date() < today
        summary_available = not current_user.last_summary_refresh_date or current_user.last_summary_refresh_date.date() < today

    # Deep analysis: reset count if day changed
    deep_count = current_user.deep_analysis_count
    if current_user.deep_analysis_last_reset and current_user.deep_analysis_last_reset.date() < today:
        deep_count = 0

    return {
        "total_tokens": total_tokens,
        "daily_tokens": daily_tokens,
        "request_count": request_count,
        "limit_daily": limit_daily,
        "refresh_tokens": current_user.refresh_tokens,
        "news_refresh_available": news_available,
        "summary_refresh_available": summary_available,
        
        "plan_type": plan,
        "deep_analysis_count": deep_count,
        "deep_analysis_limit": _get_deep_analysis_limit(plan),
        "trial_end_date": current_user.trial_end_date,
        "subscription_expiry": current_user.premium_expiry if plan == "pro" else None,
    }

@router.delete("/me", status_code=200)
async def delete_user_me(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Schedule user account for deletion (7-day grace period).
    User can cancel by logging back in within 7 days.
    Account must be at least 7 days old to be deleted.
    """
    from datetime import datetime, timezone, timedelta

    if current_user.deleted_at:
        return {"message": "Account is already scheduled for deletion."}

    # Enforce 7-day minimum account age
    if current_user.created_at:
        account_age = datetime.now(timezone.utc) - current_user.created_at.replace(tzinfo=timezone.utc)
        if account_age < timedelta(days=7):
            eligible_date = current_user.created_at.replace(tzinfo=timezone.utc) + timedelta(days=7)
            raise HTTPException(
                status_code=400,
                detail=f"Account must be at least 7 days old to be deleted. You can delete after {eligible_date.strftime('%b %d, %Y')}."
            )

    current_user.deleted_at = datetime.now(timezone.utc)
    db.add(current_user)
    await db.commit()

    return {
        "message": "Account scheduled for deletion. Log back in within 7 days to cancel."
    }

