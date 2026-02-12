from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, or_, and_
from datetime import datetime, timezone
import logging

from app.models.news import NewsArticle, NewsCategory, UserPreference
from app.services.currents import currents_service

logger = logging.getLogger(__name__)

class NewsService:
    async def get_or_create_category(self, db: AsyncSession, name: str) -> NewsCategory:
        """
        Get existing category or create a new one.
        """
        name = name.lower().strip()
        result = await db.execute(select(NewsCategory).where(NewsCategory.name == name))
        category = result.scalars().first()
        
        if not category:
            category = NewsCategory(name=name)
            db.add(category)
            await db.commit()
            await db.refresh(category)
            
        return category

    async def fetch_and_store_news(self, db: AsyncSession, user_prefs: Optional[UserPreference] = None) -> int:
        try:
            lang = user_prefs.language if user_prefs else "en"
            country = user_prefs.country if user_prefs else "us"
            
            category_filter = None
            if user_prefs and user_prefs.favorite_categories:
                category_filter = user_prefs.favorite_categories[0]

            raw_news = await currents_service.fetch_latest_news(
                language=lang,
                country=country,
                category=category_filter
            )
            
            new_count = 0
            for item in raw_news:
                url = item.get("url")
                if not url:
                    continue

                existing = await db.execute(select(NewsArticle).where(NewsArticle.url == url))
                if existing.scalars().first():
                    continue

                cat_list = item.get("category", [])
                category_obj = None
                if cat_list:
                    cat_name = cat_list[0]
                    category_obj = await self.get_or_create_category(db, cat_name)
                
                pub_date = datetime.now(timezone.utc)
                if item.get("published"):
                     try: 
                         pub_date = datetime.strptime(item.get("published"), "%Y-%m-%d %H:%M:%S %z")
                     except: 
                         pass

                article = NewsArticle(
                    title=item.get("title", "No Title"),
                    description=item.get("description", ""),
                    content=None,
                    url=url,
                    image=item.get("image", None),
                    published_at=pub_date,
                    author=item.get("author", "Unknown"),
                    category_id=category_obj.id if category_obj else None,
                    tags=cat_list,
                )
                db.add(article)
                new_count += 1
            
            await db.commit()
            return new_count

        except Exception as e:
            logger.error(f"Error fetching/storing news: {e}")
            return 0

    async def get_user_feed_from_db(
        self, 
        db: AsyncSession, 
        user_prefs: Optional[UserPreference], 
        category: Optional[str] = None,
        sentiment: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 10, 
        offset: int = 0
    ) -> List[NewsArticle]:
        query = select(NewsArticle).order_by(desc(NewsArticle.published_at))
        
        if search:
            query = query.where(NewsArticle.title.ilike(f"%{search}%"))

        if category and category.lower() != "all categories":
            query = query.where(NewsArticle.tags.contains([category]))
        
        if sentiment and sentiment.lower() != "all":
            query = query.where(NewsArticle.sentiment == sentiment.lower())

        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()

news_service = NewsService()
