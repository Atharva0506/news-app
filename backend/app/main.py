from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.cache import cache
from app.api import auth, news, payments, ai, preferences, chat, support, onboarding

import logging
import traceback
from starlette.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware

# Initialize structured logging before anything else
setup_logging()
logger = logging.getLogger("app.main")

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.state.limiter = limiter
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

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "AI News Backend API"}

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    cache_ok = await cache.health_check()
    return {
        "status": "ok",
        "cache": "connected" if cache_ok else "unavailable",
    }

