from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api import auth, news, payments, ai

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(payments.router, prefix=f"{settings.API_V1_STR}/payments", tags=["payments"])
app.include_router(news.router, prefix=f"{settings.API_V1_STR}/news", tags=["news"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])

from app.api import preferences, chat, support, onboarding
app.include_router(preferences.router, prefix=f"{settings.API_V1_STR}/preferences", tags=["preferences"])
app.include_router(onboarding.router, prefix=f"{settings.API_V1_STR}/onboarding", tags=["onboarding"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(support.router, prefix=f"{settings.API_V1_STR}/support", tags=["support"])

import logging
import traceback
from starlette.responses import JSONResponse

logger = logging.getLogger("error_handler")

@app.middleware("http")
async def global_error_email_handler(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        error_detail = traceback.format_exc()
        logger.error(f"Unhandled error on {request.method} {request.url.path}: {error_detail}")
        
        # Send email alert in background (non-blocking)
        try:
            from app.core.email import EmailService
            EmailService.send_error_alert(
                error_message=str(exc),
                endpoint=str(request.url.path),
                method=request.method
            )
        except Exception:
            logger.error("Failed to dispatch error alert email")
        
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred. The team has been notified."}
        )

@app.get("/")
async def root():
    return {"message": "AI News Backend API"}

