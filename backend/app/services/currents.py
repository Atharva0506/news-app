import httpx
import json
import os
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.news import NewsArticle, NewsCategory

class NewsProvider(ABC):
    @abstractmethod
    async def fetch_latest_news(self, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        pass
        
    @abstractmethod
    async def fetch_search_news(self, keywords: str, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        pass

class LiveNewsProvider(NewsProvider):
    BASE_URL = "https://api.currentsapi.services/v1"
    
    def __init__(self):
        self.api_key = settings.CURRENTS_API_KEY
        
    async def fetch_latest_news(self, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                params = {
                    "apiKey": self.api_key, 
                    "language": language, 
                    "limit": 5
                }
                if category:
                    params["category"] = category
                    
                response = await client.get(
                    f"{self.BASE_URL}/latest-news",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                return data.get("news", [])
            except Exception as e:
                print(f"Error fetching news (Live): {e}")
                return []

    async def fetch_search_news(self, keywords: str, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                params = {
                    "apiKey": self.api_key, 
                    "language": language, 
                    "keywords": keywords,
                    "limit": 5
                }
                if category:
                    params["category"] = category
                    
                response = await client.get(
                    f"{self.BASE_URL}/search",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                return data.get("news", [])
            except Exception as e:
                print(f"Error searching news (Live): {e}")
                return []

class TestNewsProvider(NewsProvider):
    MOCK_FILE_PATH = "app/tests/data/currents_mock.json"
    
    def __init__(self):
        # Ensure path is absolute or relative to root
        self.file_path = os.path.join(os.getcwd(), self.MOCK_FILE_PATH)
        
    async def _load_mock_data(self) -> List[Dict[str, Any]]:
        try:
            if not os.path.exists(self.file_path):
                print(f"Mock file not found: {self.file_path}")
                return []
                
            with open(self.file_path, "r") as f:
                data = json.load(f)
                return data.get("news", [])
        except Exception as e:
            print(f"Error loading mock news: {e}")
            return []
            
    async def fetch_latest_news(self, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        print(f"Fetching news in TEST mode from {self.file_path}")
        all_news = await self._load_mock_data()
        if category:
            all_news = [n for n in all_news if category.lower() in [c.lower() for c in n.get("category", [])]]
        return all_news[:5] # Apply limit
        
    async def fetch_search_news(self, keywords: str, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        print(f"Searching news in TEST mode from {self.file_path}")
        all_news = await self._load_mock_data()
        filtered = [
            n for n in all_news 
            if keywords.lower() in n.get("title", "").lower() or 
               keywords.lower() in n.get("description", "").lower()
        ]
        if category:
            filtered = [n for n in filtered if category.lower() in [c.lower() for c in n.get("category", [])]]
        return filtered[:5] # Apply limit

class CurrentsService:
    def __init__(self):
        self.mode = settings.NEWS_MODE.upper()
        if self.mode == "LIVE":
            self.provider = LiveNewsProvider()
        else:
            self.provider = TestNewsProvider()
            
    async def fetch_latest_news(self, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        return await self.provider.fetch_latest_news(language, category)

    async def fetch_search_news(self, keywords: str, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        return await self.provider.fetch_search_news(keywords, language, category)

    # Ingest logic removed as per request to not store in DB
    
currents_service = CurrentsService()
