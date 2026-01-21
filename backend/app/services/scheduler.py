import asyncio
import structlog
from app.db.session import AsyncSessionLocal
from app.services.news_service import refresh_news

log = structlog.get_logger()

async def ingestion_loop():
    while True:
        try:
            async with AsyncSessionLocal() as db:
                inserted = await refresh_news(db)
                log.info("news_refresh_done", inserted=inserted)
        except Exception as e:
            log.exception("news_refresh_failed", exc_info=e)
        await asyncio.sleep(300)  # every 5 minutes
