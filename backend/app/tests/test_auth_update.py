import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient):
    # 1. Register
    reg_data = {
        "email": "update_test@example.com",
        "password": "password123",
        "full_name": "Old Name"
    }
    response = await client.post("/api/v1/auth/register", json=reg_data)
    assert response.status_code == 200

    # 2. Login
    login_data = {
        "username": "update_test@example.com",
        "password": "password123"
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Update Name
    response = await client.put("/api/v1/auth/me", json={"full_name": "New Name"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["full_name"] == "New Name"

    # 4. Verify Update
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.json()["full_name"] == "New Name"

    # 5. Update Password
    response = await client.put("/api/v1/auth/me", json={"password": "newpassword456"}, headers=headers)
    assert response.status_code == 200

    # 6. Login with new password
    login_data_new = {
        "username": "update_test@example.com",
        "password": "newpassword456"
    }
    response = await client.post("/api/v1/auth/login", data=login_data_new)
    assert response.status_code == 200
