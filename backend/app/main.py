from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.cache import cache
from app.core.rate_limit import limiter
from app.api import auth, news, payments, ai, preferences, chat, support, onboarding, explore, share

import logging
import time
import traceback
from datetime import datetime, timezone
from starlette.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware

# Initialize structured logging before anything else
setup_logging()
logger = logging.getLogger("app.main")

# Track server start time for uptime reporting in /health
_START_TIME = time.time()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.state.limiter = limiter
from slowapi import _rate_limit_exceeded_handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Middleware Stack ---
# IMPORTANT: FastAPI middleware executes in REVERSE order of addition.
# The LAST middleware added is the OUTERMOST (runs first on request, last on response).
# Order of addition:  GZip -> ErrorHandler -> CORS
# Execution order:    CORS -> ErrorHandler -> GZip -> Route
# This ensures CORS headers are ALWAYS present, even on error responses.

# 1. GZip (innermost - runs closest to the route handler)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. Global error handler (catches unhandled exceptions)
@app.middleware("http")
async def global_error_handler(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        error_detail = traceback.format_exc()
        logger.error(f"Unhandled error on {request.method} {request.url.path}: {error_detail}")
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred. The team has been notified."}
        )

# 2.5 Security Headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# 3. CORS (outermost - added LAST so it always wraps every response with CORS headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes ---
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(payments.router, prefix=f"{settings.API_V1_STR}/payments", tags=["payments"])
app.include_router(news.router, prefix=f"{settings.API_V1_STR}/news", tags=["news"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
app.include_router(preferences.router, prefix=f"{settings.API_V1_STR}/preferences", tags=["preferences"])
app.include_router(onboarding.router, prefix=f"{settings.API_V1_STR}/onboarding", tags=["onboarding"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(support.router, prefix=f"{settings.API_V1_STR}/support", tags=["support"])
app.include_router(explore.router, prefix=f"{settings.API_V1_STR}/explore", tags=["explore"])
app.include_router(share.router, prefix=f"{settings.API_V1_STR}/share", tags=["share"])

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "AI News Backend API"}

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """
    Production health check endpoint.

    Used by:
    - External keep-alive services (e.g., cron-job.org) to prevent Render cold starts
    - Monitoring dashboards to track service availability
    - Load balancers for backend readiness checks

    Returns service status, uptime, and dependency health (cache, database).
    """
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import text

    # Check cache health
    cache_ok = await cache.health_check()

    # Check database connectivity
    db_ok = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    # Calculate uptime
    uptime_seconds = int(time.time() - _START_TIME)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    all_healthy = cache_ok and db_ok

    return {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": f"{hours}h {minutes}m {seconds}s",
        "uptime_seconds": uptime_seconds,
        "services": {
            "database": "connected" if db_ok else "unavailable",
            "cache": "connected" if cache_ok else "unavailable",
        },
        "environment": settings.APP_ENV,
    }

