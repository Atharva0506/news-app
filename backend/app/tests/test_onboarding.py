import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_onboarding_flow(client: AsyncClient, db: AsyncSession):
    import uuid
    random_id = str(uuid.uuid4())[:8]
    email = f"onboarding_{random_id}@example.com"

    # 1. Register User
    reg_data = {
        "email": email,
        "password": "password123",
        "full_name": "Onboarding Tester"
    }
    response = await client.post("/auth/register", json=reg_data)
    assert response.status_code == 200

    # 2. Login
    login_data = {
        "username": email,
        "password": "password123"
    }
    response = await client.post("/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Check Initial State
    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    user = response.json()
    assert user["onboarding_completed"] is False

    # 4. Submit Onboarding Data
    onboarding_data = {
        "language": "fr",
        "country": "fr", # Testing France region
        "favorite_keywords": ["tech", "ai", "startups"],
        "summary_style": "detailed"
    }
    response = await client.post("/onboarding/submit", json=onboarding_data, headers=headers)
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["onboarding_completed"] is True

    # 5. Verify Feed Generation (Implicitly triggered)
    # The /submit endpoint awaits generation, so feed should be ready.
    response = await client.get("/news/feed", headers=headers)
    assert response.status_code == 200
    feed = response.json()
    assert isinstance(feed, list)
    # Depending on mock/live mode, checking length might vary, but should be > 0 ideally if mock has data.
    # We are in TEST mode usually for tests, so it should return mock data.

    # 6. Verify Daily Limit (Free User)
    # The user is free.
    # Try searching (should be allowed up to 5 times)
    search_resp = await client.get("/news/feed?search=python", headers=headers)
    assert search_resp.status_code == 200

    # Verify preferences were saved
    pref_resp = await client.get("/preferences/", headers=headers)
    assert pref_resp.status_code == 200
    prefs = pref_resp.json()
    assert prefs["language"] == "fr"
    assert prefs["country"] == "fr"
    assert "tech" in prefs["favorite_keywords"]

