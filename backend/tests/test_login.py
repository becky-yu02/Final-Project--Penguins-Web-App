import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_signup(default_client: AsyncClient):
    response = await default_client.post(
        "/penguins/auth/signup",
        json={"username": "newuser", "password": "testpass"}
    )

    assert response.status_code == 200
    assert response.json()["message"] == "User created successfully"


@pytest.mark.anyio
async def test_login_success(default_client: AsyncClient):
    await default_client.post(
        "/penguins/auth/signup",
        json={"username": "user1", "password": "testpass"}
    )

    response = await default_client.post(
        "/penguins/auth/sign-in",
        data={"username": "user1", "password": "testpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.anyio
async def test_login_wrong_password(default_client: AsyncClient):
    await default_client.post(
        "/penguins/auth/signup",
        json={"username": "user2", "password": "correct"}
    )

    response = await default_client.post(
        "/penguins/auth/sign-in",
        data={"username": "user2", "password": "wrong"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    assert response.status_code == 401