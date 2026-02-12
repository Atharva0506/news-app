import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.services.news_service import news_service
from app.models.news import UserPreference, NewsArticle
from sqlalchemy import select, delete

import logging
import traceback

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_news_persistence():
    logger.info("Starting News Persistence Test...")
    try:
        async with AsyncSessionLocal() as db:
            logger.info("Database session created.")
            
            # 2. Test Fetch and Store
            logger.info("Fetching and storing news (simulating refresh)...")
            # Creating a dummy user pref
            dummy_prefs = UserPreference(language="en", country="us")
            
            count = await news_service.fetch_and_store_news(db, dummy_prefs)
            logger.info(f"Stored {count} new articles.")
            
            # 3. Verify DB Content
            result = await db.execute(select(NewsArticle).limit(5))
            articles = result.scalars().all()
            logger.info(f"Retrieved {len(articles)} articles from DB.")
            
            if articles:
                for art in articles:
                    logger.info(f" - {art.title} (Cat: {art.tags})")
            else:
                 logger.error("ERROR: No articles found in DB!")

            # 4. Test Get Feed
            logger.info("Testing get_user_feed_from_db...")
            feed = await news_service.get_user_feed_from_db(db, dummy_prefs, limit=2)
            logger.info(f"Feed returned {len(feed)} articles.")
            assert len(feed) <= 2

        logger.info("Test Complete.")
    except Exception as e:
        logger.error(f"Test Failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(test_news_persistence())
    except KeyboardInterrupt:
        logger.info("Interrupted.")
    except Exception as e:
        logger.error(f"Execution Error: {e}")
