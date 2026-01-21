# app/services/news_service.py
import hashlib
import re
from typing import Optional, Any
from datetime import datetime, timezone

import orjson
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.news import NewsArticle
from app.services import currents
from app.utils.redis import redis_client


# -------------------------
# Normalization + dedupe
# -------------------------

def _norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s

def _norm_url(url: str) -> str:
    u = (url or "").strip()
    u = re.sub(r"#.*$", "", u)              # drop fragments
    # remove common tracking params (simple)
    u = re.sub(r"([?&])utm_[^=]+=[^&]+", r"\1", u)
    u = re.sub(r"([?&])ref=[^&]+", r"\1", u)
    u = re.sub(r"[?&]+$", "", u)
    u = re.sub(r"\?$", "", u)
    return u.lower()

def _dedupe_hash(title: str, url: str) -> str:
    base = f"{_norm(title)}|{_norm_url(url)}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


# -------------------------
# Currents daily limit guard
# -------------------------

def _today_key_utc() -> str:
    # Keep it UTC so your servers are consistent
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

async def _currents_allow_or_raise(limit_per_day: int = 20) -> None:
    """
    Implements a soft quota:
    - increments a per-day counter only when we are about to call Currents
    - blocks once the count reaches limit_per_day
    - optional cooldown if the API starts returning rate errors (handled elsewhere)
    """
    day = _today_key_utc()
    key = f"currents:count:{day}"

    # set expiry so key disappears automatically (2 days is safe)
    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 60 * 60 * 24 * 2)

    if count > limit_per_day:
        # Don’t call Currents; serve cache/DB instead
        raise RuntimeError(f"Currents API daily limit exceeded ({limit_per_day}/day)")

async def _currents_backoff_active() -> bool:
    """
    If Currents starts failing (429/5xx), you can set a temporary lock
    so the app stops hammering the provider.
    """
    return bool(await redis_client.get("currents:backoff"))

async def _set_currents_backoff(seconds: int = 900) -> None:
    await redis_client.set("currents:backoff", "1", ex=seconds)


# -------------------------
# DB upsert + caching
# -------------------------

async def upsert_articles(db: AsyncSession, payload: dict) -> int:
    news = payload.get("news") or []
    inserted = 0

    for a in news:
        title = a.get("title") or ""
        url = a.get("url") or ""
        external_id = a.get("id") or url or title

        # Redis dedupe (7 days)
        h = _dedupe_hash(title, url)
        if await redis_client.sismember("dedupe:articles", h):
            continue

        exists = (await db.execute(
            select(NewsArticle).where(
                NewsArticle.source == "currents",
                NewsArticle.external_id == str(external_id),
            )
        )).scalar_one_or_none()
        if exists:
            continue

        art = NewsArticle(
            source="currents",
            external_id=str(external_id),
            title=title,
            url=url,
            author=a.get("author"),
            published_at=a.get("published"),
            raw_payload=a,
        )
        db.add(art)
        inserted += 1

        await redis_client.sadd("dedupe:articles", h)
        await redis_client.expire("dedupe:articles", 60 * 60 * 24 * 7)

    await db.commit()

    # Invalidate caches that depend on latest news
    await redis_client.delete("cache:feed:latest")
    return inserted


async def get_feed(db: AsyncSession) -> list[dict[str, Any]]:
    """
    Returns list of *dicts* ready for API response.
    Cached path returns payload immediately.
    Non-cached path queries DB and then caches the response payload.
    """
    cache_key = "cache:feed:latest"
    cached = await redis_client.get(cache_key)
    if cached:
        return orjson.loads(cached)

    res = await db.execute(
        select(NewsArticle).order_by(NewsArticle.published_at.desc().nullslast()).limit(50)
    )
    items = list(res.scalars().all())

    payload = [
        {
            "id": str(a.id),
            "title": a.title,
            "url": a.url,
            "author": a.author,
            "published_at": a.published_at.isoformat() if a.published_at else None,
            "raw_payload": a.raw_payload,
        }
        for a in items
    ]

    # Cache full payload for UI speed (30s)
    await redis_client.set(cache_key, orjson.dumps(payload), ex=30)
    return payload


async def get_article(db: AsyncSession, article_id: str) -> Optional[dict[str, Any]]:
    cache_key = f"cache:article:{article_id}"
    cached = await redis_client.get(cache_key)
    if cached:
        return orjson.loads(cached)

    res = await db.execute(select(NewsArticle).where(NewsArticle.id == article_id))
    art = res.scalar_one_or_none()
    if not art:
        return None

    data = {
        "id": str(art.id),
        "title": art.title,
        "url": art.url,
        "author": art.author,
        "published_at": art.published_at.isoformat() if art.published_at else None,
        "raw_payload": art.raw_payload,
    }
    await redis_client.set(cache_key, orjson.dumps(data), ex=120)
    return data


async def refresh_news(
    db: AsyncSession,
    category: str | None = None,
    keyword: str | None = None,
    limit_per_day: int = 20,
) -> dict[str, Any]:
    """
    Calls Currents API if allowed; otherwise does NOT call it.
    Returns metadata about what happened, so your endpoint can show it.

    This approach prevents burning your 20/day quota during dev/testing.
    """
    # If we recently hit provider errors, don’t call again for a while
    if await _currents_backoff_active():
        return {"called_provider": False, "inserted": 0, "reason": "provider_backoff_active"}

    try:
        await _currents_allow_or_raise(limit_per_day=limit_per_day)
    except RuntimeError as e:
        return {"called_provider": False, "inserted": 0, "reason": str(e)}

    try:
        if keyword:
            payload = await currents.search(keyword)
        elif category:
            payload = await currents.fetch_by_category(category)
        else:
            payload = await currents.fetch_latest()

        inserted = await upsert_articles(db, payload)
        return {"called_provider": True, "inserted": inserted, "reason": None}

    except Exception as e:
        # If Currents starts failing, pause calls for 15 minutes
        await _set_currents_backoff(seconds=900)
        return {"called_provider": False, "inserted": 0, "reason": f"provider_error: {type(e).__name__}"}
