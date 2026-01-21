import time
from fastapi import Request, HTTPException
from app.utils.redis import redis_client
from app.core.config import settings

# Sliding window approximation using two buckets (current minute + previous minute).
async def rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    cur = int(now // 60)
    prev = cur - 1
    frac = (now % 60) / 60.0

    kcur = f"rl:{ip}:{cur}"
    kprev = f"rl:{ip}:{prev}"

    cur_count = await redis_client.incr(kcur)
    if cur_count == 1:
        await redis_client.expire(kcur, 120)

    prev_count_raw = await redis_client.get(kprev)
    prev_count = int(prev_count_raw) if prev_count_raw else 0

    approx = int(prev_count * (1.0 - frac) + cur_count)

    if approx > settings.RATE_LIMIT_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
