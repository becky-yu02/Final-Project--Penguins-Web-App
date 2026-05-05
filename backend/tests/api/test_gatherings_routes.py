import pytest
from datetime import datetime, timedelta

from app.models.location import Location
from app.models.gathering import Gathering


# create test place
@pytest.fixture
async def test_place():
    place = Location(
        name="Test Place",
        type_of_place="cafe",
        address="123 Test St",
        community_notes=[],
    )
    await place.insert()
    return place


# create gathering
@pytest.mark.asyncio
async def test_create_gathering(client, test_place):
    response = await client.post(
        "/penguins/gatherings",
        json={
            "place_id": str(test_place.id),
            "datetime_start": datetime.utcnow().isoformat(),
            "title": "Test Gathering",
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert data["message"] == "Gathering created"


# create gathering invalid
@pytest.mark.asyncio
async def test_create_gathering_invalid_place(client):
    response = await client.post(
        "/penguins/gatherings",
        json={
            "place_id": "fake-id",
            "datetime_start": datetime.utcnow().isoformat(),
            "title": "Bad Gathering",
        },
    )

    assert response.status_code == 404


# only host can update gathering; create gathering first
@pytest.mark.asyncio
async def test_update_gathering_success(client, test_place):
    create_res = await client.post(
        "/penguins/gatherings",
        json={
            "place_id": str(test_place.id),
            "datetime_start": datetime.utcnow().isoformat(),
            "title": "Original",
        },
    )

    gathering_id = create_res.json()["id"]

    response = await client.put(
        f"/penguins/gatherings/{gathering_id}",
        json={"title": "Updated Title"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"


# invalid, user that's not host updating gathering; create gathering first
@pytest.mark.asyncio
async def test_update_gathering_not_host(client, test_place):
    create_res = await client.post(
        "/penguins/gatherings",
        json={
            "place_id": str(test_place.id),
            "datetime_start": datetime.utcnow().isoformat(),
            "title": "Original",
        },
    )

    gathering_id = create_res.json()["id"]

    # simulate different user by overriding dependency
    from app.main import app
    from app.core.dependencies import get_current_user
    from types import SimpleNamespace

    async def fake_user():
        return SimpleNamespace(id="different-user")

    app.dependency_overrides[get_current_user] = fake_user

    response = await client.put(
        f"/penguins/gatherings/{gathering_id}",
        json={"title": "Hack"},
    )

    assert response.status_code == 403

    # restore override
    from tests.conftest import override_get_current_user

    app.dependency_overrides[get_current_user] = override_get_current_user


# invalid status
@pytest.mark.asyncio
async def test_update_invalid_status(client, test_place):
    create_res = await client.post(
        "/penguins/gatherings",
        json={
            "place_id": str(test_place.id),
            "datetime_start": datetime.utcnow().isoformat(),
            "title": "Test",
        },
    )

    gathering_id = create_res.json()["id"]

    response = await client.put(
        f"/penguins/gatherings/{gathering_id}",
        json={"status": "paused"},  # invalid enum
    )

    assert response.status_code == 422


# join gathering
@pytest.mark.asyncio
async def test_join_gathering(client, test_place):
    create_res = await client.post(
        "/penguins/gatherings",
        json={
            "place_id": str(test_place.id),
            "datetime_start": datetime.utcnow().isoformat(),
            "title": "Join Test",
        },
    )

    gathering_id = create_res.json()["id"]

    response = await client.post(f"/penguins/gatherings/{gathering_id}/join")

    assert response.status_code == 200
    assert "participant_user_ids" in response.json()


# leave gathering
@pytest.mark.asyncio
async def test_leave_gathering(client, test_place):
    create_res = await client.post(
        "/penguins/gatherings",
        json={
            "place_id": str(test_place.id),
            "datetime_start": datetime.utcnow().isoformat(),
            "title": "Leave Test",
        },
    )

    gathering_id = create_res.json()["id"]

    response = await client.post(f"/penguins/gatherings/{gathering_id}/leave")

    assert response.status_code == 200


# persistence check; see if data is stored in db
@pytest.mark.asyncio
async def test_update_persists(client, test_place):
    create_res = await client.post(
        "/penguins/gatherings",
        json={
            "place_id": str(test_place.id),
            "datetime_start": datetime.utcnow().isoformat(),
            "title": "Before",
        },
    )

    gathering_id = create_res.json()["id"]

    await client.put(
        f"/penguins/gatherings/{gathering_id}",
        json={"title": "After"},
    )

    updated = await Gathering.get(gathering_id)

    assert updated.title == "After"
