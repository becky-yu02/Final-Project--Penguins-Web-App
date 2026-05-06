import logging
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import get_current_user, get_current_user_optional, check_note_permission
from app.models.location import Location, CommunityNote, CommunitySummary, AmenityOverride
from app.models.user import User, UserRole
from app.schemas.location import (
    PlaceCreateRequest,
    PlaceUpdateRequest,
    AmenityOverrideRequest,
)
from app.schemas.note import CommunityNoteRequest, NoteUpdate


router = APIRouter(prefix="/places", tags=["places"])
logger = logging.getLogger(__name__)


def recompute_summary(notes: list[CommunityNote], override: AmenityOverride | None = None) -> CommunitySummary:
    def majority(field: str) -> bool | None:
        if override is not None:
            val = getattr(override, field)
            if val is not None:
                return val
        opinions = [getattr(n, field) for n in notes if getattr(n, field) is not None]
        if not opinions:
            return None
        return (opinions.count(True) / len(opinions)) >= 0.5

    ratings = [n.rating for n in notes if n.rating is not None]

    feel_counts: dict[str, int] = {}
    for n in notes:
        for f in (n.feel or []):
            feel_counts[f] = feel_counts.get(f, 0) + 1
    feels = [f for f, _ in sorted(feel_counts.items(), key=lambda x: x[1], reverse=True)][:3]

    return CommunitySummary(
        wifi_available=majority("wifi_available"),
        outlets_available=majority("outlets_available"),
        parking_available=majority("parking_available"),
        food_available=majority("food_available"),
        overall_feel=feels,
        overall_rating=round(sum(ratings) / len(ratings), 2) if ratings else None,
    )


def to_place_summary(place: Location):
    return {
        "id": str(place.id),
        "name": place.name,
        "address": place.address,
        "type_of_place": place.type_of_place,
        "coordinates": place.coordinates,
        "community_summary": place.community_summary,
    }


def apply_place_updates(place: Location, payload: PlaceUpdateRequest) -> list[str]:
    updated_fields: list[str] = []
    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data:
        place.name = payload.name
        updated_fields.append("name")
    if "address" in update_data:
        place.address = payload.address
        updated_fields.append("address")
    if "type_of_place" in update_data:
        place.type_of_place = payload.type_of_place
        updated_fields.append("type_of_place")
    if "coordinates" in update_data:
        place.coordinates = payload.coordinates
        updated_fields.append("coordinates")
    if "admin_approved" in update_data:
        place.admin_approved = payload.admin_approved
        updated_fields.append("admin_approved")

    return updated_fields


def apply_note_updates(note: CommunityNote, payload: NoteUpdate) -> list[str]:
    updated_fields: list[str] = []
    update_data = payload.model_dump(exclude_unset=True)

    if "wifi_available" in update_data:
        note.wifi_available = payload.wifi_available
        updated_fields.append("wifi_available")
    if "outlets_available" in update_data:
        note.outlets_available = payload.outlets_available
        updated_fields.append("outlets_available")
    if "parking_available" in update_data:
        note.parking_available = payload.parking_available
        updated_fields.append("parking_available")
    if "food_available" in update_data:
        note.food_available = payload.food_available
        updated_fields.append("food_available")
    if "comment" in update_data:
        note.comment = payload.comment
        updated_fields.append("comment")
    if "image_url" in update_data:
        note.image_url = payload.image_url
        updated_fields.append("image_url")

    return updated_fields


@router.post("")
async def create_place(
    payload: PlaceCreateRequest,
    current_user: User = Depends(get_current_user),
):
    place = Location(**payload.model_dump(), admin_approved=current_user.role == UserRole.ADMIN)
    await place.insert()
    logger.info("Created place place_id=%s creator_user_id=%s admin_approved=%s", place.id, current_user.id, place.admin_approved)
    return {"message": "Place created", "id": str(place.id)}


@router.get("")
async def get_places(current_user: User | None = Depends(get_current_user_optional)):
    is_admin = current_user is not None and current_user.role == UserRole.ADMIN
    query = {} if is_admin else {"admin_approved": True}
    places = await Location.find(query).to_list()
    logger.info("Listed places count=%s is_admin=%s", len(places), is_admin)
    return places


@router.get("/search")
async def search_places(
    q: str = Query(min_length=1, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User | None = Depends(get_current_user_optional),
):
    is_admin = current_user is not None and current_user.role == UserRole.ADMIN
    search_term = q.strip()
    if not search_term:
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    search_filter = {
        "$or": [
            {"name": {"$regex": search_term, "$options": "i"}},
            {"address": {"$regex": search_term, "$options": "i"}},
            {"type_of_place": {"$regex": search_term, "$options": "i"}},
        ]
    }
    if not is_admin:
        search_filter["admin_approved"] = True
    places = await Location.find(search_filter).limit(limit).to_list()
    logger.info("Searched places query=%s result_count=%s is_admin=%s", search_term, len(places), is_admin)
    return [to_place_summary(place) for place in places]


@router.get("/{place_id}")
async def get_place(place_id: str):
    place = await Location.get(place_id)
    if not place:
        logger.warning("Requested place not found place_id=%s", place_id)
        raise HTTPException(status_code=404, detail="Place not found")
    logger.info("Fetched place place_id=%s", place_id)
    return place


@router.put("/{place_id}")
async def update_place(
    place_id: str,
    payload: PlaceUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    place = await Location.get(place_id)
    if not place:
        logger.warning("Update target place not found place_id=%s actor_user_id=%s", place_id, current_user.id)
        raise HTTPException(status_code=404, detail="Place not found")

    if payload.admin_approved is not None and current_user.role != UserRole.ADMIN:
        logger.warning("Non-admin attempted to set admin_approved place_id=%s actor_user_id=%s", place_id, current_user.id)
        raise HTTPException(status_code=403, detail="Admin access required to approve places.")

    updated_fields = apply_place_updates(place, payload)
    place.updated_at = datetime.now(UTC)
    await place.save()
    logger.info("Updated place place_id=%s actor_user_id=%s fields=%s", place.id, current_user.id, updated_fields)
    return place


@router.post("/{place_id}/notes")
async def add_community_note(
    place_id: str,
    payload: CommunityNoteRequest,
    current_user: User = Depends(get_current_user),
):
    place = await Location.get(place_id)
    if not place:
        logger.warning("Add note failed because place was not found place_id=%s actor_user_id=%s", place_id, current_user.id)
        raise HTTPException(status_code=404, detail="Place not found")

    note = CommunityNote(
        user_id=str(current_user.id),
        **payload.model_dump()
    )
    place.community_notes.append(note)
    place.community_summary = recompute_summary(place.community_notes, place.admin_amenity_override)
    place.updated_at = datetime.now(UTC)
    await place.save()
    logger.info("Added community note place_id=%s note_id=%s actor_user_id=%s", place.id, note.note_id, current_user.id)

    return {"message": "Community note added", "place_id": str(place.id), "note_id": note.note_id}


@router.get("/{place_id}/notes/{note_id}")
async def get_community_note(
    place_id: str,
    note_id: str,
):
    place = await Location.get(place_id)
    if not place:
        logger.warning("Requested note place not found place_id=%s note_id=%s", place_id, note_id)
        raise HTTPException(status_code=404, detail="Place not found")

    note = next((n for n in place.community_notes if n.note_id == note_id), None)
    if not note:
        logger.warning("Requested note not found place_id=%s note_id=%s", place_id, note_id)
        raise HTTPException(status_code=404, detail="Note not found")

    logger.info("Fetched community note place_id=%s note_id=%s", place_id, note_id)
    return note


@router.put("/{place_id}/notes/{note_id}")
async def update_community_note(
    place_id: str,
    note_id: str,
    payload: NoteUpdate,
    place: Location = Depends(check_note_permission),
):
    # Find the note index
    note_index = next((i for i, n in enumerate(place.community_notes) if n.note_id == note_id), None)
    if note_index is None:
        logger.warning("Update target note not found place_id=%s note_id=%s", place_id, note_id)
        raise HTTPException(status_code=404, detail="Note not found")

    updated_fields = apply_note_updates(place.community_notes[note_index], payload)
    place.community_summary = recompute_summary(place.community_notes, place.admin_amenity_override)
    place.updated_at = datetime.now(UTC)
    await place.save()
    logger.info("Updated community note place_id=%s note_id=%s fields=%s", place.id, note_id, updated_fields)

    return {"message": "Community note updated", "place_id": str(place.id), "note_id": note_id}


@router.delete("/{place_id}/notes/{note_id}")
async def delete_community_note(
    place_id: str,
    note_id: str,
    place: Location = Depends(check_note_permission),
):
    # Find the note
    note = next((n for n in place.community_notes if n.note_id == note_id), None)
    if not note:
        logger.warning("Delete target note not found place_id=%s note_id=%s", place_id, note_id)
        raise HTTPException(status_code=404, detail="Note not found")

    # Remove the note
    place.community_notes = [n for n in place.community_notes if n.note_id != note_id]
    place.community_summary = recompute_summary(place.community_notes, place.admin_amenity_override)
    place.updated_at = datetime.now(UTC)
    await place.save()
    logger.warning("Deleted community note place_id=%s note_id=%s", place.id, note_id)

    return {"message": "Community note deleted", "place_id": str(place.id), "note_id": note_id}


@router.put("/{place_id}/amenities")
async def set_amenity_override(
    place_id: str,
    payload: AmenityOverrideRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required.")

    place = await Location.get(place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    place.admin_amenity_override = AmenityOverride(**payload.model_dump())
    place.community_summary = recompute_summary(place.community_notes, place.admin_amenity_override)
    place.updated_at = datetime.now(UTC)
    await place.save()
    logger.info("Set amenity override place_id=%s actor_user_id=%s", place.id, current_user.id)
    return place


@router.delete("/{place_id}/amenities")
async def clear_amenity_override(
    place_id: str,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required.")

    place = await Location.get(place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    place.admin_amenity_override = None
    place.community_summary = recompute_summary(place.community_notes, None)
    place.updated_at = datetime.now(UTC)
    await place.save()
    logger.info("Cleared amenity override place_id=%s actor_user_id=%s", place.id, current_user.id)
    return place
