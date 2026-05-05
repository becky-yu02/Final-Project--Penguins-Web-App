import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.dependencies import get_current_user


@pytest.fixture
async def unauthenticated_client():
    app.dependency_overrides.pop(get_current_user, None)

    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # restore override
    from tests.conftest import override_get_current_user

    app.dependency_overrides[get_current_user] = override_get_current_user


# successful signup/registration
@pytest.mark.asyncio
async def test_register_success(unauthenticated_client):
    response = await unauthenticated_client.post(
        "/penguins/auth/register",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "strongpassword",
            "first_name": "New",
            "last_name": "User",
        },
    )

    assert response.status_code == 201
    data = response.json()

    assert data["username"] == "newuser"
    assert data["role"] == "basic"


#  duplicate username
@pytest.mark.asyncio
async def test_register_duplicate_username(unauthenticated_client):
    payload = {
        "username": "duplicate",
        "email": "dup1@example.com",
        "password": "strongpassword",
        "first_name": "Dup",
        "last_name": "User",
    }

    await unauthenticated_client.post("/penguins/auth/register", json=payload)

    response = await unauthenticated_client.post(
        "/penguins/auth/register",
        json={**payload, "email": "different@example.com"},
    )

    assert response.status_code == 400


# successful login
@pytest.mark.asyncio
async def test_login_success(unauthenticated_client):
    await unauthenticated_client.post(
        "/penguins/auth/register",
        json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "strongpassword",
            "first_name": "Login",
            "last_name": "User",
        },
    )

    response = await unauthenticated_client.post(
        "/penguins/auth/login",
        data={
            "username": "loginuser",
            "password": "strongpassword",
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


# failed login/incorrect password
@pytest.mark.asyncio
async def test_login_invalid_password(unauthenticated_client):
    await unauthenticated_client.post(
        "/penguins/auth/register",
        json={
            "username": "wrongpass",
            "email": "wrong@example.com",
            "password": "correctpassword",
            "first_name": "Wrong",
            "last_name": "Pass",
        },
    )

    response = await unauthenticated_client.post(
        "/penguins/auth/login",
        data={
            "username": "wrongpass",
            "password": "badpassword",
        },
    )

    assert response.status_code == 401


# failed login/user not registered
@pytest.mark.asyncio
async def test_login_user_not_found(unauthenticated_client):
    response = await unauthenticated_client.post(
        "/penguins/auth/login",
        data={
            "username": "ghost",
            "password": "whatever",
        },
    )

    assert response.status_code == 401


# token authentication
@pytest.mark.asyncio
async def test_token_allows_access(unauthenticated_client):
    await unauthenticated_client.post(
        "/penguins/auth/register",
        json={
            "username": "tokenuser",
            "email": "token@example.com",
            "password": "strongpassword",
            "first_name": "Token",
            "last_name": "User",
        },
    )

    login_response = await unauthenticated_client.post(
        "/penguins/auth/login",
        data={
            "username": "tokenuser",
            "password": "strongpassword",
        },
    )

    token = login_response.json()["access_token"]

    # client with token
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/penguins/users/me", headers={"Authorization": f"Bearer {token}"}
        )

    assert response.status_code == 200
