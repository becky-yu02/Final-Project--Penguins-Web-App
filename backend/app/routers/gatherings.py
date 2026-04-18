from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.models.gathering import Gathering
from app.models.user import User
from app.schemas.gathering import GatheringCreateRequest, GatheringUpdateRequest

router = APIRouter(prefix="/gatherings", tags=["gatherings"])


@router.post("")
async def create_gathering(
    payload: GatheringCreateRequest,
    current_user: User = Depends(get_current_user),
):
    gathering = Gathering(
        host_user_id=str(current_user.id),
        place_id=payload.place_id,
        datetime_start=payload.datetime_start,
        datetime_end=payload.datetime_end,
        title=payload.title,
        description=payload.description,
        visibility=payload.visibility,
        image_url=payload.image_url,
        participant_user_ids=[str(current_user.id)],
    )
    await gathering.insert()
    return {"message": "Gathering created", "id": str(gathering.id)}


@router.get("")
async def list_gatherings():
    return await Gathering.find_all().to_list()


@router.get("/active")
async def list_active_gatherings():
    return await Gathering.find(Gathering.status == "active").to_list()


@router.get("/{gathering_id}")
async def get_gathering(gathering_id: str):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        raise HTTPException(status_code=404, detail="Gathering not found")
    return gathering


@router.put("/{gathering_id}")
async def update_gathering(
    gathering_id: str,
    payload: GatheringUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        raise HTTPException(status_code=404, detail="Gathering not found")

    if gathering.host_user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the host can update this gathering")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(gathering, key, value)

    gathering.updated_at = datetime.now(UTC)
    await gathering.save()
    return gathering


@router.post("/{gathering_id}/join")
async def join_gathering(
    gathering_id: str,
    current_user: User = Depends(get_current_user),
):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        raise HTTPException(status_code=404, detail="Gathering not found")

    user_id = str(current_user.id)
    if user_id not in gathering.participant_user_ids:
        gathering.participant_user_ids.append(user_id)
        gathering.updated_at = datetime.now(UTC)
        await gathering.save()

    return {"message": "Joined gathering", "participant_user_ids": gathering.participant_user_ids}


@router.post("/{gathering_id}/leave")
async def leave_gathering(
    gathering_id: str,
    current_user: User = Depends(get_current_user),
):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        raise HTTPException(status_code=404, detail="Gathering not found")

    user_id = str(current_user.id)
    if user_id in gathering.participant_user_ids:
        gathering.participant_user_ids.remove(user_id)
        gathering.updated_at = datetime.now(UTC)
        await gathering.save()

    return {"message": "Left gathering", "participant_user_ids": gathering.participant_user_ids}