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
        self.api_keys = settings.CURRENTS_API_KEYS
        self.current_key_index = 0
        
    def _get_current_key(self) -> str:
        if not self.api_keys:
            raise Exception("No Currents API keys configured")
        return self.api_keys[self.current_key_index]
        
    def _rotate_key(self):
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        print(f"Rotating to Currents API key index {self.current_key_index}")

    async def fetch_latest_news(self, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            for _ in range(len(self.api_keys)):
                try:
                    params = {
                        "apiKey": self._get_current_key(), 
                        "language": language, 
                        "limit": 5
                    }
                    if category:
                        params["category"] = category
                        
                    response = await client.get(
                        f"{self.BASE_URL}/latest-news",
                        params=params
                    )
                    
                    if response.status_code == 429 or response.status_code == 401:
                        print(f"Currents API Error {response.status_code} with key index {self.current_key_index}. Rotating...")
                        self._rotate_key()
                        continue
                        
                    response.raise_for_status()
                    data = response.json()
                    return data.get("news", [])
                except Exception as e:
                    print(f"Error fetching news (Live): {e}")
                    if isinstance(e, httpx.HTTPStatusError):
                         if e.response.status_code in [429, 401]:
                             self._rotate_key()
                             continue
                    break 
            return []

    async def fetch_search_news(self, keywords: str, language: str = "en", category: Optional[str] = None) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
             for _ in range(len(self.api_keys)):
                try:
                    params = {
                        "apiKey": self._get_current_key(), 
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
                    
                    if response.status_code == 429 or response.status_code == 401:
                        print(f"Currents API Error {response.status_code} with key index {self.current_key_index}. Rotating...")
                        self._rotate_key()
                        continue

                    response.raise_for_status()
                    data = response.json()
                    return data.get("news", [])
                except Exception as e:
                    print(f"Error searching news (Live): {e}")
                    if isinstance(e, httpx.HTTPStatusError):
                         if e.response.status_code in [429, 401]:
                             self._rotate_key()
                             continue
                    break
             return []

class TestNewsProvider(NewsProvider):
    MOCK_FILE_PATH = "app/tests/data/currents_mock.json"
    
    def __init__(self):
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
    
currents_service = CurrentsService()
