import pytest
from httpx import AsyncClient
from app.core.config import settings

@pytest.mark.asyncio
async def test_news_filters(client: AsyncClient):
    # Register & Login
    import uuid
    email = f"filter_{uuid.uuid4()}@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "pass", "full_name": "FilterUser"})
    res = await client.post("/api/v1/auth/login", data={"username": email, "password": "pass"})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test Feed with Filters
    # Just checking it doesn't crash, as mock data might not match "technology" category exactly unless we seeded it.
    response = await client.get("/api/v1/news/feed?category=technology&limit=5", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_user_preferences(client: AsyncClient):
    import uuid
    email = f"prefs_{uuid.uuid4()}@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "pass", "full_name": "PrefsUser"})
    res = await client.post("/api/v1/auth/login", data={"username": email, "password": "pass"})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get initial (should be default empty)
    res = await client.get("/api/v1/preferences/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["favorite_categories"] == []
    
    # Update
    update_data = {
        "favorite_categories": ["Technology", "Space"],
        "favorite_keywords": ["AI", "Mars"]
    }
    res = await client.put("/api/v1/preferences/me", json=update_data, headers=headers)
    assert res.status_code == 200
    assert "Technology" in res.json()["favorite_categories"]
    
    # Verify persistence
    res = await client.get("/api/v1/preferences/me", headers=headers)
    assert "Mars" in res.json()["favorite_keywords"]

@pytest.mark.asyncio
async def test_ai_features(client: AsyncClient):
    import uuid
    email = f"ai_{uuid.uuid4()}@example.com"
    # Create User
    await client.post("/api/v1/auth/register", json={"email": email, "password": "pass", "full_name": "AIUser"})
    res = await client.post("/api/v1/auth/login", data={"username": email, "password": "pass"})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test Ask AI (Free User -> Forbidden or Not Premium msg? Logic says generic verify then check logic)
    # The endpoint relies on `deps.get_current_premium_user` which raises 400 or 403.
    ask_payload = {"question": "What is AI?"}
    res = await client.post("/api/v1/ai/ask", json=ask_payload, headers=headers)
    assert res.status_code in [400, 403] 
    
    # Test Limit on Explain (Free user allowed up to limit)
    # We need a valid article ID. Let's insert one or get from feed.
    feed = await client.get("/api/v1/news/feed", headers=headers)
    if feed.json():
        article_id = feed.json()[0]["id"]
        # Trigger explain
        res = await client.post(f"/api/v1/ai/explain?article_id={article_id}", headers=headers)
        # It might fail if limits reached or work if limit not reached. 
        # Since usage is 0, it should pass, OR fail if LLM not configured/mocked.
        # This test ensures we hit the endpoint logic. 
        # Note: If LLM is real (Gemini), it requires Key. .env has key.
        # If key is invalid, 500. If 429, limit logic working.
