import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_create_gathering(default_client: AsyncClient, auth_headers):
    response = await default_client.post(
        "/penguins/gatherings",
        json={
            "title": "Test Gathering",
            "place_id": "place-1",
            "datetime_start": "2026-05-10T12:00:00Z",
            "visibility": "public"
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Test Gathering"


@pytest.mark.anyio
async def test_list_gatherings(default_client: AsyncClient):
    response = await default_client.get("/penguins/gatherings")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.anyio
async def test_delete_gathering(default_client: AsyncClient, auth_headers):
    create = await default_client.post(
        "/penguins/gatherings",
        json={
            "title": "Delete Me",
            "place_id": "place-1",
            "datetime_start": "2026-05-10T12:00:00Z",
            "visibility": "public"
        },
        headers=auth_headers
    )

    gid = create.json()["id"]

    delete = await default_client.delete(
        f"/penguins/gatherings/{gid}",
        headers=auth_headers
    )

    assert delete.status_code == 200