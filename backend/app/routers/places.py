from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.models.location import Location, CommunityNote
from app.models.user import User
from app.schemas.location import (
    PlaceCreateRequest,
    PlaceUpdateRequest,
    CommunityNoteRequest,
)

router = APIRouter(prefix="/places", tags=["places"])


@router.post("")
async def create_place(
    payload: PlaceCreateRequest,
    current_user: User = Depends(get_current_user),
):
    place = Location(**payload.model_dump())
    await place.insert()
    return {"message": "Place created", "id": str(place.id)}


@router.get("")
async def get_places():
    places = await Location.find_all().to_list()
    return places


@router.get("/{place_id}")
async def get_place(place_id: str):
    place = await Location.get(place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    return place


@router.put("/{place_id}")
async def update_place(
    place_id: str,
    payload: PlaceUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    place = await Location.get(place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(place, key, value)

    place.updated_at = datetime.now(UTC)
    await place.save()
    return place


@router.post("/{place_id}/notes")
async def add_community_note(
    place_id: str,
    payload: CommunityNoteRequest,
    current_user: User = Depends(get_current_user),
):
    place = await Location.get(place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    note = CommunityNote(
        user_id=str(current_user.id),
        **payload.model_dump()
    )
    place.community_notes.append(note)
    place.updated_at = datetime.now(UTC)
    await place.save()

    return {"message": "Community note added", "place_id": str(place.id)}