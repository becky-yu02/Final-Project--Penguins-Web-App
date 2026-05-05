import pytest


# get current user
@pytest.mark.asyncio
async def test_get_me(client):
    response = await client.get("/penguins/users/me")

    assert response.status_code == 200
    data = response.json()

    assert "first_name" in data
    assert "last_name" in data


# successful update on user
@pytest.mark.asyncio
async def test_update_me_success(client):
    response = await client.patch("/penguins/users/me", json={"first_name": "Alice"})

    assert response.status_code == 200
    data = response.json()

    assert data["first_name"] == "Alice"


# successful PARTIAL update on user
@pytest.mark.asyncio
async def test_update_me_partial_update(client):
    response = await client.patch("/penguins/users/me", json={"first_name": "Alice"})

    assert response.status_code == 200
    data = response.json()

    assert data["first_name"] == "Alice"

    assert "last_name" in data


# invalid payload
@pytest.mark.asyncio
async def test_update_me_invalid_field(client):
    response = await client.patch("/penguins/users/me", json={"email": "not-allowed"})

    assert response.status_code in (400, 422)


# unauthorized user update
@pytest.mark.asyncio
async def test_update_me_unauthorized(client):
    response = await client.patch("/penguins/users/me", json={"first_name": "Hacker"})

    assert response.status_code in (401, 403)


# test user role
@pytest.mark.asyncio
async def test_user_role_present(client):
    response = await client.get("/penguins/users/me")

    assert response.status_code == 200
    assert "role" in response.json()
