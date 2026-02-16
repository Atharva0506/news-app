from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core import security
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.schemas.user import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)

async def get_db() -> Generator[AsyncSession, None, None]:
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            raise HTTPException(status_code=403, detail="Could not validate credentials")
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    # In Pydantic v2/SQLAlchemy, get might not work with Async. Use select.
    # Note: user_id is the subject.
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .options(selectinload(User.preferences))
        .where(User.id == token_data.sub)
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if current_user.deleted_at:
        from datetime import datetime, timezone, timedelta
        if datetime.now(timezone.utc) - current_user.deleted_at > timedelta(days=7):
            raise HTTPException(status_code=403, detail="Account has been deleted")
    return current_user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user

def get_current_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Requires premium access (trial OR pro)."""
    from datetime import datetime, timezone
    # Auto-downgrade if premium expired
    if current_user.premium_expiry and datetime.now(timezone.utc) > current_user.premium_expiry:
        if current_user.plan_type != "pro":
            current_user.is_premium = False
    if not current_user.is_premium:
        raise HTTPException(
            status_code=403,
            detail="Premium subscription required for this feature"
        )
    return current_user

def get_current_pro_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Requires paid Pro subscription (not trial)."""
    if current_user.plan_type != "pro":
        raise HTTPException(
            status_code=403,
            detail="Pro subscription required. This feature is not available during the free trial."
        )
    return current_user

async def get_current_user_optional(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(reusable_oauth2_optional)
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        return None
    
    if token_data.sub is None:
        return None
        
    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalars().first()
    return user

async def get_current_active_user_optional(
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Optional[User]:
    if not current_user:
        return None
    if not current_user.is_active:
        return None
    return current_user
