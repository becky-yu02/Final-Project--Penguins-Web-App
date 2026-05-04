import pytest
from httpx import AsyncClient
from app.main import app


@pytest.fixture
async def default_client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
async def auth_headers(default_client: AsyncClient):
    await default_client.post(
        "/penguins/auth/signup", json={"username": "testuser", "password": "testpass"}
    )

    response = await default_client.post(
        "/penguins/auth/sign-in",
        data={"username": "testuser", "password": "testpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}
