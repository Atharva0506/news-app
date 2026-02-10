import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    import uuid
    email = f"test_{uuid.uuid4()}@example.com"
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": "Test User"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == email
    assert "id" in data

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    import uuid
    email = f"login_{uuid.uuid4()}@example.com"
    # Register first (or rely on DB state from previous test if not cleaned, but order is strictly isolated typically)
    # Better to register in fixture or here
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123"
        }
    )
    
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": email,
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
