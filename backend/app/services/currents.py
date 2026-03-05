import httpx
import json
import logging
import os
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from app.core.config import settings

logger = logging.getLogger("app.services.currents")

class NewsProvider(ABC):
    @abstractmethod
    async def fetch_latest_news(self, language: str = "en", country: str = "us", type_: int = 1, category: Optional[str] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def fetch_search_news(self, keywords: str, language: str = "en", country: str = "us", type_: int = 1, category: Optional[str] = None) -> List[Dict[str, Any]]:
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
        logger.warning("Rotating to Currents API key index %d", self.current_key_index)

    async def _fetch_from_api(self, endpoint: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            for _ in range(len(self.api_keys)):
                try:
                    # Inject current key
                    params["apiKey"] = self._get_current_key()

                    response = await client.get(
                        f"{self.BASE_URL}/{endpoint}",
                        params=params,
                        timeout=10.0
                    )

                    if response.status_code in [401, 429]:
                        logger.warning("Currents API error %d with key index %d, rotating", response.status_code, self.current_key_index)
                        self._rotate_key()
                        continue

                    response.raise_for_status()
                    data = response.json()
                    return data.get("news", [])
                except Exception as e:
                    logger.error("Error calling Currents (%s) with key index %d", endpoint, self.current_key_index, exc_info=e)
                    self._rotate_key()
                    continue
            return []

    async def fetch_latest_news(self, language: str = "en", country: str = "us", type_: int = 1, category: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {
            "language": language,
            "country": country,
            "type": type_,
            "limit": 5
        }
        if category:
            params["category"] = category

        return await self._fetch_from_api("latest-news", params)

    async def fetch_search_news(self, keywords: str, language: str = "en", country: str = "us", type_: int = 1, category: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {
            "language": language,
            "country": country,
            "type": type_,
            "keywords": keywords,
            "limit": 5
        }
        if category:
            params["category"] = category

        return await self._fetch_from_api("search", params)

class TestNewsProvider(NewsProvider):
    MOCK_FILE_PATH = "app/tests/data/currents_mock.json"

    def __init__(self):
        self.file_path = os.path.join(os.getcwd(), self.MOCK_FILE_PATH)

    async def _load_mock_data(self) -> List[Dict[str, Any]]:
        try:
            if not os.path.exists(self.file_path):
                logger.warning("Mock file not found: %s", self.file_path)
                return []

            with open(self.file_path, "r") as f:
                data = json.load(f)
                return data.get("news", [])
        except Exception as e:
            logger.error("Error loading mock news", exc_info=e)
            return []

    async def fetch_latest_news(self, language: str = "en", country: str = "us", type_: int = 1, category: Optional[str] = None) -> List[Dict[str, Any]]:
        logger.debug("Fetching news in TEST mode from %s", self.file_path)
        all_news = await self._load_mock_data()
        if category:
            all_news = [n for n in all_news if category.lower() in [c.lower() for c in n.get("category", [])]]
        return all_news[:5] # Apply limit

    async def fetch_search_news(self, keywords: str, language: str = "en", country: str = "us", type_: int = 1, category: Optional[str] = None) -> List[Dict[str, Any]]:
        logger.debug("Searching news in TEST mode from %s", self.file_path)
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

    async def fetch_latest_news(self, language: str = "en", country: str = "us", type_: int = 1, category: Optional[str] = None) -> List[Dict[str, Any]]:
        return await self.provider.fetch_latest_news(language, country, type_, category)

    async def fetch_search_news(self, keywords: str, language: str = "en", country: str = "us", type_: int = 1, category: Optional[str] = None) -> List[Dict[str, Any]]:
        return await self.provider.fetch_search_news(keywords, language, country, type_, category)

currents_service = CurrentsService()
