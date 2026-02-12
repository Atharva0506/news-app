from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User

async def check_trial_expiration(user: User, db: AsyncSession) -> User:
    """
    Checks if the user's trial has expired.
    If expired, downgrades to 'free' and removes premium status.
    """
    if user.plan_type == "trial" and user.trial_end_date:
        if datetime.now(timezone.utc) > user.trial_end_date:
            user.plan_type = "free"
            user.is_premium = False
            user.premium_expiry = None
            db.add(user)
            await db.commit()
            await db.refresh(user)
    return user

async def assert_deep_analysis_access(user: User, db: AsyncSession):
    """
    Enforces Deep Analysis limits:
    - Pro: Unlimited
    - Trial: 1 per day
    - Free: 0 (Locked)
    """
    # First, ensure trial status is up to date
    user = await check_trial_expiration(user, db)
    
    if user.plan_type == "pro":
        return True # Unlimited
    
    if user.plan_type == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "PLAN_LIMIT_REACHED", "message": "Upgrade to Pro to unlock Deep Analysis."}
        )
        
    if user.plan_type == "trial":
        # Check usage for today
        # We rely on the caller to increment usage or we check log. 
        # Using `deep_analysis_count` field in User model for simpler tracking?
        # The prompt asked for `deep_analysis_count` field. Let's use it.
        
        # Reset if day changed
        now = datetime.now(timezone.utc)
        if user.deep_analysis_last_reset:
            if user.deep_analysis_last_reset.date() < now.date():
                user.deep_analysis_count = 0
                user.deep_analysis_last_reset = now
                db.add(user)
                await db.commit()
        else:
             user.deep_analysis_last_reset = now
             user.deep_analysis_count = 0
             db.add(user)
             await db.commit()
             
        if user.deep_analysis_count >= 1:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "TRIAL_LIMIT_REACHED", "message": "Upgrade to Pro to unlock unlimited Deep Analysis."}
            )
            
    return True

async def increment_deep_analysis_usage(user: User, db: AsyncSession):
    """
    Increments the usage user counter.
    """
    if user.plan_type == "pro":
        return
        
    user.deep_analysis_count += 1
    user.deep_analysis_last_reset = datetime.now(timezone.utc)
    db.add(user)
    await db.commit()
