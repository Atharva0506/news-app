from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.db.session import get_db
from app.schemas.auth import RegisterIn, LoginIn, TokenOut, MeOut
from app.services.auth_service import register_user, authenticate_user, issue_tokens, refresh_tokens
from app.api.deps import get_current_user
from app.core.oauth import oauth
from app.models.user import User, OAuthAccount

router = APIRouter(prefix="/auth", tags=["auth"])

def _now():
    return datetime.now(timezone.utc)

@router.post("/register", response_model=MeOut)
async def register(data: RegisterIn, db: AsyncSession = Depends(get_db)):
    try:
        u = await register_user(db, data.email, data.password)
        return MeOut(id=str(u.id), email=u.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    tokens = await issue_tokens(db, user)
    return TokenOut(**tokens.model_dump())

@router.post("/refresh", response_model=TokenOut)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    try:
        tokens = await refresh_tokens(db, refresh_token)
        return TokenOut(**tokens.model_dump())
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(get_current_user)):
    return MeOut(id=str(user.id), email=user.email)

@router.get("/oauth/google")
async def oauth_google(request: Request):
    redirect_uri = request.url_for("oauth_google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/oauth/google/callback", name="oauth_google_callback", response_model=TokenOut)
async def oauth_google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo") or {}
    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email from Google")

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        user = User(email=email, password_hash=None, is_active=True, created_at=_now())
        db.add(user)
        await db.commit()
        await db.refresh(user)

    provider_id = userinfo.get("sub")
    acct = (await db.execute(select(OAuthAccount).where(
        OAuthAccount.provider == "google",
        OAuthAccount.provider_account_id == provider_id
    ))).scalar_one_or_none()
    if not acct:
        db.add(OAuthAccount(user_id=user.id, provider="google", provider_account_id=provider_id, access_token=None))
        await db.commit()

    tokens = await issue_tokens(db, user)
    return TokenOut(**tokens.model_dump())

@router.get("/oauth/github")
async def oauth_github(request: Request):
    redirect_uri = request.url_for("oauth_github_callback")
    return await oauth.github.authorize_redirect(request, redirect_uri)

@router.get("/oauth/github/callback", name="oauth_github_callback", response_model=TokenOut)
async def oauth_github_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.github.authorize_access_token(request)
    # fetch primary email
    resp = await oauth.github.get("user/emails", token=token)
    emails = resp.json()
    primary = next((e for e in emails if e.get("primary")), None) or (emails[0] if emails else None)
    email = primary.get("email") if primary else None
    if not email:
        raise HTTPException(status_code=400, detail="No email from GitHub")

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        user = User(email=email, password_hash=None, is_active=True, created_at=_now())
        db.add(user)
        await db.commit()
        await db.refresh(user)

    gh_user = (await oauth.github.get("user", token=token)).json()
    provider_id = str(gh_user.get("id"))

    acct = (await db.execute(select(OAuthAccount).where(
        OAuthAccount.provider == "github",
        OAuthAccount.provider_account_id == provider_id
    ))).scalar_one_or_none()
    if not acct:
        db.add(OAuthAccount(user_id=user.id, provider="github", provider_account_id=provider_id, access_token=None))
        await db.commit()

    tokens = await issue_tokens(db, user)
    return TokenOut(**tokens.model_dump())
