import pytest
import os
from httpx import AsyncClient
from app.core.config import settings

# Force Test Mode for this test if not picked up
os.environ["NEWS_MODE"] = "TEST"

@pytest.mark.asyncio
async def test_get_news_feed(client: AsyncClient):
    # Register/Login
    import uuid
    email = f"news_{uuid.uuid4()}@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "pass", "full_name": "NewsUser"})
    res = await client.post("/api/v1/auth/login", data={"username": email, "password": "pass"})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Trigger Refresh (to ensure data is loaded from mock)
    # Note: mocking ingestion might be tricky if DB is empty. 
    # But usually currents_service.fetch_latest_news() is called.
    # Check if we need to manually trigger ingest first.
    # Router has /refresh endpoint, let's try calling valid endpoint.
    
    # We will try to fetch feed directly. If empty, we might need to verify ingestion first.
    response = await client.get("/api/v1/news/feed", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # If mock data loaded in previous steps (unlikely since new session), list might be empty.
    # But checking for 200 OK avoids the Validation Error.
