from httpx import AsyncClient
import pytest

from app.models.location import Location, CommunityNote
from backend.app.models.user import User


# create test place
@pytest.mark.asyncio
async def test_create_place(client: AsyncClient):
    response = await client.post(
        "/penguins/places",
        json={
            "name": "Coffee Shop",
            "address": "123 Main St",
            "type_of_place": "cafe",
            "coordinates": {"lat": 40.0, "lng": -90.0},
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert data["message"] == "Place created"


# get all places
@pytest.mark.asyncio
async def test_get_places(client: AsyncClient):
    response = await client.get("/penguins/places")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


# get a place
@pytest.mark.asyncio
async def test_get_place(client: AsyncClient):
    place = Location(
        name="Library",
        address="Campus",
        type_of_place="study",
    )
    await place.insert()

    response = await client.get(f"/penguins/places/{place.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Library"


# update place
@pytest.mark.asyncio
async def test_update_place(client: AsyncClient):
    place = Location(
        name="Old Name",
        address="Old Address",
        type_of_place="cafe",
    )
    await place.insert()

    response = await client.put(
        f"/penguins/places/{place.id}",
        json={"name": "New Name"},
    )

    assert response.status_code == 200

    updated = await Location.get(place.id)
    assert updated.name == "New Name"


# insert community note
@pytest.mark.asyncio
async def test_add_community_note(client: AsyncClient):
    place = Location(
        name="Cafe",
        address="Street",
        type_of_place="cafe",
    )
    await place.insert()

    response = await client.post(
        f"/penguins/places/{place.id}/notes",
        json={
            "wifi_available": True,
            "comment": "Great wifi",
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert "note_id" in data

    updated = await Location.get(place.id)
    assert len(updated.community_notes) == 1
    assert updated.community_notes[0].comment == "Great wifi"


# get community note
@pytest.mark.asyncio
async def test_get_community_note(client: AsyncClient):
    note = CommunityNote(
        user_id="user-1",
        comment="Nice place",
    )

    place = Location(
        name="Cafe",
        address="Street",
        type_of_place="cafe",
        community_notes=[note],
    )
    await place.insert()

    response = await client.get(f"/penguins/places/{place.id}/notes/{note.note_id}")

    assert response.status_code == 200
    assert response.json()["comment"] == "Nice place"


# update community note, if given permission
@pytest.mark.asyncio
async def test_update_note(client: AsyncClient, basic_user: User):
    note = CommunityNote(
        user_id=str(basic_user.id),
        comment="Old comment",
    )

    place = Location(
        name="Cafe",
        address="Street",
        type_of_place="cafe",
        community_notes=[note],
    )
    await place.insert()

    response = await client.put(
        f"/penguins/places/{place.id}/notes/{note.note_id}",
        json={"comment": "Updated comment"},
    )

    assert response.status_code == 200

    updated = await Location.get(place.id)
    assert updated.community_notes[0].comment == "Updated comment"


# delete note
@pytest.mark.asyncio
async def test_delete_note(client: AsyncClient, basic_user: User):
    note = CommunityNote(
        user_id=str(basic_user.id),
        comment="To be deleted",
    )

    place = Location(
        name="Cafe",
        address="Street",
        type_of_place="cafe",
        community_notes=[note],
    )
    await place.insert()

    response = await client.delete(f"/penguins/places/{place.id}/notes/{note.note_id}")

    assert response.status_code == 200

    updated = await Location.get(place.id)
    assert len(updated.community_notes) == 0


# search for place
@pytest.mark.asyncio
async def test_search_places(client: AsyncClient):
    place = Location(
        name="Star Coffee",
        address="Main Street",
        type_of_place="cafe",
    )
    await place.insert()

    response = await client.get("/penguins/places/search?q=Star")

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert any("Star Coffee" in p["name"] for p in data)
