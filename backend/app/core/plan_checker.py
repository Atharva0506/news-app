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

def _get_deep_analysis_limit(plan_type: str) -> int:
    """Returns the daily deep analysis limit for a plan."""
    if plan_type == "pro":
        return 3
    if plan_type == "trial":
        return 1
    return 0

async def assert_deep_analysis_access(user: User, db: AsyncSession):
    """
    Enforces Deep Analysis limits:
    - Pro: 3 per day
    - Trial: 1 per day
    - Free: 0 (Locked)
    """
    user = await check_trial_expiration(user, db)

    if user.plan_type == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "PLAN_LIMIT_REACHED", "message": "Upgrade to Pro to unlock Deep Analysis."}
        )

    limit = _get_deep_analysis_limit(user.plan_type)

    # Reset counter if day changed
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

    if user.deep_analysis_count >= limit:
        if user.plan_type == "trial":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "TRIAL_LIMIT_REACHED", "message": "Trial limit: 1 deep analysis/day. Upgrade to Pro for 3/day."}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "PRO_LIMIT_REACHED", "message": "Daily limit reached (3/day). Try again tomorrow."}
            )

    return True

async def increment_deep_analysis_usage(user: User, db: AsyncSession):
    """
    Increments the usage user counter.
    """
    user.deep_analysis_count += 1
    user.deep_analysis_last_reset = datetime.now(timezone.utc)
    db.add(user)
    await db.commit()
