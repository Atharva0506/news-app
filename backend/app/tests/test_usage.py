import pytest
from httpx import AsyncClient
from app.main import app
from app.core.config import settings

@pytest.mark.asyncio
async def test_usage_stats(client: AsyncClient):
    import uuid
    email = f"usage_{uuid.uuid4()}@example.com"
    # Register
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": "Usage Test"
        }
    )
    
    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        data={
            "username": email,
            "password": "password123"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get usage stats
    response = await client.get(
        f"{settings.API_V1_STR}/auth/me/usage", headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_tokens" in data
    assert "daily_tokens" in data
    assert "request_count" in data
    assert "limit_daily" in data
    assert data["limit_daily"] == 1000 # Free user limit
