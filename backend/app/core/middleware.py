import time
import uuid
import structlog
from fastapi import Request
from starlette.responses import Response, JSONResponse

logger = structlog.get_logger()

async def logging_middleware(request: Request, call_next):
    rid = request.headers.get("x-request-id") or str(uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=rid,
        method=request.method,
        path=str(request.url.path),
    )

    start = time.perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception as e:
        logger.exception("Unhandled error", exc_info=e)
        response = JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
    finally:
        duration_ms = (time.perf_counter() - start) * 1000.0
        structlog.contextvars.bind_contextvars(duration_ms=duration_ms)

    response.headers["x-request-id"] = rid
    logger.info("request_done", status_code=response.status_code)
    return response
