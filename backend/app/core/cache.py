"""
Optional Redis Caching Layer

Falls back gracefully to an in-memory no-op cache when Redis is unavailable,
so the application works identically in development without Redis installed.

Usage:
    from app.core.cache import cache

    # Store a value (with optional TTL in seconds)
    await cache.set("daily_briefing:user123", data, ttl=3600)

    # Retrieve a value
    cached = await cache.get("daily_briefing:user123")

    # Delete a key
    await cache.delete("daily_briefing:user123")
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger("app.core.cache")


class RedisCache:
    """Async Redis cache wrapper with JSON serialization."""

    def __init__(self, url: str):
        import redis.asyncio as aioredis

        self._redis = aioredis.from_url(
            url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )
        logger.info("Redis cache initialized (%s)", url.split("@")[-1] if "@" in url else url)

    async def get(self, key: str) -> Optional[Any]:
        try:
            raw = await self._redis.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as e:
            logger.warning("Redis GET failed for key=%s", key, exc_info=e)
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        try:
            serialized = json.dumps(value, default=str)
            await self._redis.set(key, serialized, ex=ttl)
            return True
        except Exception as e:
            logger.warning("Redis SET failed for key=%s", key, exc_info=e)
            return False

    async def delete(self, key: str) -> bool:
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.warning("Redis DELETE failed for key=%s", key, exc_info=e)
            return False

    async def health_check(self) -> bool:
        try:
            return await self._redis.ping()
        except Exception:
            return False


class NoOpCache:
    """In-memory no-op fallback when Redis is not configured."""

    async def get(self, key: str) -> Optional[Any]:
        return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        return False

    async def delete(self, key: str) -> bool:
        return False

    async def health_check(self) -> bool:
        return False


def _create_cache():
    """
    Factory: returns RedisCache if REDIS_URL is configured,
    otherwise returns a NoOpCache that silently passes through.
    """
    from app.core.config import settings

    redis_url = getattr(settings, "REDIS_URL", None)

    if redis_url:
        try:
            return RedisCache(redis_url)
        except Exception as e:
            logger.warning("Failed to initialize Redis, falling back to NoOpCache: %s", e)
            return NoOpCache()
    else:
        logger.info("REDIS_URL not set — using NoOpCache (no caching)")
        return NoOpCache()


cache = _create_cache()
