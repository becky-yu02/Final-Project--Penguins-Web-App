import logging
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import get_current_user
from app.models.gathering import Gathering, GatheringStatus
from app.models.location import Location
from app.models.user import User, UserRole
from app.schemas.gathering import GatheringCreateRequest, GatheringUpdateRequest

router = APIRouter(prefix="/gatherings", tags=["gatherings"])
logger = logging.getLogger(__name__)


def _as_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


async def clear_broadcasting_for_gathering(gathering_id: str) -> None:
    users = await User.find(
        {
            "online_status.broadcasting": True,
            "online_status.current_gathering_id": gathering_id,
        }
    ).to_list()
    for user in users:
        user.online_status.broadcasting = False
        user.online_status.current_gathering_id = None
        user.updated_at = datetime.now(UTC)
        await user.save()
    if users:
        logger.info(
            "Cleared broadcasting for %s user(s) on terminal gathering gathering_id=%s",
            len(users),
            gathering_id,
        )


async def auto_update_status(gathering: Gathering) -> Gathering:
    if gathering.status in (GatheringStatus.ENDED, GatheringStatus.CANCELLED):
        return gathering

    now = datetime.now(UTC)
    start = _as_utc(gathering.datetime_start)
    end = _as_utc(gathering.datetime_end)

    if end and now > end:
        new_status = GatheringStatus.ENDED
    elif start and now >= start:
        new_status = GatheringStatus.ACTIVE
    else:
        new_status = GatheringStatus.SCHEDULED

    if new_status != gathering.status:
        gathering.status = new_status
        gathering.updated_at = datetime.now(UTC)
        await gathering.save()
        logger.info(
            "Auto-updated gathering status gathering_id=%s status=%s",
            gathering.id,
            new_status,
        )
        if new_status == GatheringStatus.ENDED:
            await clear_broadcasting_for_gathering(str(gathering.id))

    return gathering


def to_gathering_summary(gathering: Gathering):
    return {
        "id": str(gathering.id),
        "place_id": gathering.place_id,
        "title": gathering.title,
        "description": gathering.description,
        "visibility": gathering.visibility,
        "status": gathering.status,
        "datetime_start": gathering.datetime_start,
        "datetime_end": gathering.datetime_end,
        "image_url": gathering.image_url,
        "host_user_id": gathering.host_user_id,
        "participant_count": len(gathering.participant_user_ids),
    }


def apply_gathering_updates(
    gathering: Gathering,
    payload: GatheringUpdateRequest,
) -> list[str]:
    updated_fields: list[str] = []
    update_data = payload.model_dump(exclude_unset=True)

    if "datetime_start" in update_data:
        gathering.datetime_start = payload.datetime_start
        updated_fields.append("datetime_start")
    if "datetime_end" in update_data:
        gathering.datetime_end = payload.datetime_end
        updated_fields.append("datetime_end")
    if "title" in update_data:
        gathering.title = payload.title
        updated_fields.append("title")
    if "description" in update_data:
        gathering.description = payload.description
        updated_fields.append("description")
    if "visibility" in update_data:
        gathering.visibility = payload.visibility
        updated_fields.append("visibility")
    if "status" in update_data:
        gathering.status = payload.status
        updated_fields.append("status")
    if "image_url" in update_data:
        gathering.image_url = payload.image_url
        updated_fields.append("image_url")

    return updated_fields


@router.post("")
async def create_gathering(
    payload: GatheringCreateRequest,
    current_user: User = Depends(get_current_user),
):
    place = await Location.get(payload.place_id)
    if not place:
        logger.warning(
            "Gathering creation rejected because place was not found place_id=%s host_user_id=%s",
            payload.place_id,
            current_user.id,
        )
        raise HTTPException(status_code=404, detail="Place not found")

    gathering = Gathering(
        host_user_id=str(current_user.id),
        place_id=payload.place_id,
        datetime_start=payload.datetime_start,
        datetime_end=payload.datetime_end,
        title=payload.title,
        description=payload.description,
        visibility=payload.visibility,
        image_url=payload.image_url,
        participant_user_ids=[],
    )
    await gathering.insert()
    logger.info(
        "Created gathering gathering_id=%s host_user_id=%s",
        gathering.id,
        current_user.id,
    )
    return {"message": "Gathering created", "id": str(gathering.id)}


@router.get("")
async def list_gatherings():
    gatherings = await Gathering.find_all().to_list()
    gatherings = [await auto_update_status(g) for g in gatherings]

    broadcasting_users = await User.find({"online_status.broadcasting": True}).to_list()
    here_now_map: dict[str, int] = {}
    for u in broadcasting_users:
        gid = u.online_status.current_gathering_id
        if gid:
            here_now_map[gid] = here_now_map.get(gid, 0) + 1

    result = []
    for g in gatherings:
        g_dict = g.model_dump(by_alias=True, mode="json")
        g_dict["here_now_count"] = here_now_map.get(str(g.id), 0)
        result.append(g_dict)

    logger.info("Listed gatherings count=%s", len(gatherings))
    return result


@router.get("/search")
async def search_gatherings(
    q: str = Query(min_length=1, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
):
    search_term = q.strip()
    if not search_term:
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    search_filter = {
        "$or": [
            {"title": {"$regex": search_term, "$options": "i"}},
            {"description": {"$regex": search_term, "$options": "i"}},
            {"visibility": {"$regex": search_term, "$options": "i"}},
            {"status": {"$regex": search_term, "$options": "i"}},
        ]
    }
    gatherings = await Gathering.find(search_filter).limit(limit).to_list()
    logger.info(
        "Searched gatherings query=%s result_count=%s",
        search_term,
        len(gatherings),
    )
    return [to_gathering_summary(gathering) for gathering in gatherings]


@router.get("/active")
async def list_active_gatherings():
    gatherings = await Gathering.find(
        Gathering.status == GatheringStatus.ACTIVE
    ).to_list()
    logger.info("Listed active gatherings count=%s", len(gatherings))
    return gatherings


@router.get("/{gathering_id}")
async def get_gathering(gathering_id: str):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        logger.warning("Requested gathering not found gathering_id=%s", gathering_id)
        raise HTTPException(status_code=404, detail="Gathering not found")
    gathering = await auto_update_status(gathering)
    logger.info("Fetched gathering gathering_id=%s", gathering_id)
    return gathering


@router.put("/{gathering_id}")
async def update_gathering(
    gathering_id: str,
    payload: GatheringUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        logger.warning(
            "Update target gathering not found gathering_id=%s actor_user_id=%s",
            gathering_id,
            current_user.id,
        )
        raise HTTPException(status_code=404, detail="Gathering not found")

    if gathering.host_user_id != str(current_user.id):
        logger.warning(
            "Unauthorized gathering update attempt gathering_id=%s actor_user_id=%s",
            gathering_id,
            current_user.id,
        )
        raise HTTPException(
            status_code=403, detail="Only the host can update this gathering"
        )

    updated_fields = apply_gathering_updates(gathering, payload)
    gathering.updated_at = datetime.now(UTC)
    await gathering.save()
    logger.info(
        "Updated gathering gathering_id=%s actor_user_id=%s fields=%s",
        gathering.id,
        current_user.id,
        updated_fields,
    )
    if "status" in updated_fields and gathering.status in (
        GatheringStatus.ENDED,
        GatheringStatus.CANCELLED,
    ):
        await clear_broadcasting_for_gathering(str(gathering.id))
    return gathering


@router.delete("/{gathering_id}")
async def delete_gathering(
    gathering_id: str,
    current_user: User = Depends(get_current_user),
):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        raise HTTPException(status_code=404, detail="Gathering not found")

    is_host = gathering.host_user_id == str(current_user.id)
    if not (is_host or current_user.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=403, detail="Only the host can delete this gathering"
        )

    await gathering.delete()
    await clear_broadcasting_for_gathering(gathering_id)
    logger.info(
        "Deleted gathering gathering_id=%s actor_user_id=%s",
        gathering_id,
        current_user.id,
    )
    return {"message": "Gathering deleted"}


@router.post("/{gathering_id}/join")
async def join_gathering(
    gathering_id: str,
    current_user: User = Depends(get_current_user),
):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        logger.warning(
            "Join target gathering not found gathering_id=%s actor_user_id=%s",
            gathering_id,
            current_user.id,
        )
        raise HTTPException(status_code=404, detail="Gathering not found")

    user_id = str(current_user.id)
    if user_id not in gathering.participant_user_ids:
        gathering.participant_user_ids.append(user_id)
        gathering.updated_at = datetime.now(UTC)
        await gathering.save()
        logger.info(
            "Joined gathering gathering_id=%s actor_user_id=%s",
            gathering.id,
            current_user.id,
        )
    else:
        logger.info(
            "Join skipped because user already present gathering_id=%s actor_user_id=%s",
            gathering.id,
            current_user.id,
        )

    return {
        "message": "Joined gathering",
        "participant_user_ids": gathering.participant_user_ids,
    }


@router.post("/{gathering_id}/leave")
async def leave_gathering(
    gathering_id: str,
    current_user: User = Depends(get_current_user),
):
    gathering = await Gathering.get(gathering_id)
    if not gathering:
        logger.warning(
            "Leave target gathering not found gathering_id=%s actor_user_id=%s",
            gathering_id,
            current_user.id,
        )
        raise HTTPException(status_code=404, detail="Gathering not found")

    user_id = str(current_user.id)
    if user_id in gathering.participant_user_ids:
        gathering.participant_user_ids.remove(user_id)
        gathering.updated_at = datetime.now(UTC)
        if not gathering.participant_user_ids:  # If no participants left
            await gathering.delete()
            logger.warning(
                "Gathering deleted after final participant left gathering_id=%s actor_user_id=%s",
                gathering.id,
                current_user.id,
            )
            return {"message": "Left gathering and gathering deleted (no participants)"}
        else:
            await gathering.save()
            logger.info(
                "Left gathering gathering_id=%s actor_user_id=%s",
                gathering.id,
                current_user.id,
            )
    else:
        logger.warning(
            "Leave skipped because user was not a participant gathering_id=%s actor_user_id=%s",
            gathering.id,
            current_user.id,
        )

    return {
        "message": "Left gathering",
        "participant_user_ids": gathering.participant_user_ids,
    }
