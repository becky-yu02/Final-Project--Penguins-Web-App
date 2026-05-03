import pytest
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.user import User


@pytest.mark.anyio
async def test_sign_new_user(default_client: AsyncClient) -> None:
    payload = {"username": "testuser123", "password": "test-password"}

    headers = {"accept": "application/json", "Content-Type": "application/json"}

    expected_response = {"message": "User created successfully"}

    response = await default_client.post("/auth/signup", json=payload, headers=headers)

    assert response.status_code == 200
    assert response.json() == expected_response


@pytest.mark.anyio
async def test_sign_user_in(default_client: AsyncClient) -> None:
    await User.insert_one(
        User(
            username="testuser123",
            password=hash_password("test-password").decode("utf-8"),
        )
    )

    payload = {"username": "testuser123", "password": "test-password"}

    headers = {
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    response = await default_client.post("/auth/sign-in", data=payload, headers=headers)

    assert response.status_code == 200

    body = response.json()
    assert body["username"] == "testuser123"
    assert body["role"] == "BasicUser"
    assert isinstance(body["access_token"], str)
    assert "expiry" in body


@pytest.mark.anyio
async def test_sign_user_in_wrong_password(default_client: AsyncClient) -> None:
    await User.insert_one(
        User(
            username="testuser123",
            password=hash_password("correct-password").decode("utf-8"),
        )
    )

    payload = {"username": "testuser123", "password": "wrong-password"}

    headers = {
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    response = await default_client.post("/auth/sign-in", data=payload, headers=headers)

    assert response.status_code == 401


@pytest.mark.anyio
async def test_sign_user_in_user_not_found(default_client: AsyncClient) -> None:
    payload = {"username": "nonexistentuser", "password": "whatever"}

    headers = {
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    response = await default_client.post("/auth/sign-in", data=payload, headers=headers)

    assert response.status_code == 401
