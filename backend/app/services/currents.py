import httpx
from app.core.config import settings

BASE = "https://api.currentsapi.services/v1"

async def fetch_latest() -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE}/latest-news", params={"apiKey": settings.CURRENTS_API_KEY})
        r.raise_for_status()
        return r.json()

async def fetch_by_category(category: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE}/latest-news", params={"category": category, "apiKey": settings.CURRENTS_API_KEY})
        r.raise_for_status()
        return r.json()

async def search(keyword: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE}/search", params={"keywords": keyword, "apiKey": settings.CURRENTS_API_KEY})
        r.raise_for_status()
        return r.json()
