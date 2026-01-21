import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    TokenPair, decode_token
)
from app.core.config import settings
from app.models.user import User, RefreshToken

def _now():
    return datetime.now(timezone.utc)

def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

async def register_user(db: AsyncSession, email: str, password: str) -> User:
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing:
        raise ValueError("Email already registered")
    user = User(email=email, password_hash=hash_password(password), created_at=_now())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

async def issue_tokens(db: AsyncSession, user: User, rotate_from_refresh: str | None = None) -> TokenPair:
    # Token rotation: every refresh exchange yields a NEW refresh token. [web:5][web:3]
    token_family = secrets.token_hex(16)
    if rotate_from_refresh:
        old_payload = decode_token(rotate_from_refresh)
        token_family = old_payload.get("fam") or token_family

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id), token_family=token_family)

    rt = RefreshToken(
        user_id=user.id,
        token_family=token_family,
        token_hash=_sha256(refresh),
        revoked=False,
        created_at=_now(),
        expires_at=_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)

    if rotate_from_refresh:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == _sha256(rotate_from_refresh))
            .values(revoked=True)
        )

    await db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)

async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenPair:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise ValueError("Invalid token type")

    token_hash = _sha256(refresh_token)
    stored = (await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))).scalar_one_or_none()
    if not stored or stored.revoked or stored.expires_at < _now():
        raise ValueError("Refresh token invalid")

    user_id = payload["sub"]
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()

    return await issue_tokens(db, user, rotate_from_refresh=refresh_token)
