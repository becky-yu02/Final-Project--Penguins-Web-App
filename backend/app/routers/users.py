import logging
from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException, Depends, Query
from starlette import status

from app.core.dependencies import get_current_user
from app.core.authz import require_admin
from app.models.location import Location
from app.models.user import User, UserRole
from app.schemas.user import UserUpdateRequest, UserAccessUpdate

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


def to_user_summary(user: User):
    return {
        "id": str(user.id),
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_image_url": user.profile_image_url,
        "online_status": user.online_status,
    }


def to_user_private(user: User):
    return {
        "email": user.email,
        "role": user.role,
        "favorite_places": user.favorite_places,
        "friend_ids": user.friend_ids,
        "preferences": user.preferences,
        **to_user_summary(user),
    }


def can_view_private_profile(target_user: User, actor_user: User) -> bool:
    return str(target_user.id) == str(actor_user.id) or actor_user.role == UserRole.ADMIN


def serialize_user_for_actor(target_user: User, actor_user: User):
    if can_view_private_profile(target_user, actor_user):
        return to_user_private(target_user)

    return to_user_summary(target_user)


def private_fields_for_actor(target_user: User, actor_user: User) -> str:
    if can_view_private_profile(target_user, actor_user):
        return "private"
    return "summary"


def apply_user_updates(user: User, payload: UserUpdateRequest) -> list[str]:
    updated_fields: list[str] = []
    update_data = payload.model_dump(exclude_unset=True)

    if "first_name" in update_data:
        user.first_name = payload.first_name
        updated_fields.append("first_name")
    if "last_name" in update_data:
        user.last_name = payload.last_name
        updated_fields.append("last_name")
    if "profile_image_url" in update_data:
        user.profile_image_url = payload.profile_image_url
        updated_fields.append("profile_image_url")
    if "preferences" in update_data:
        user.preferences = payload.preferences
        updated_fields.append("preferences")
    if "online_status" in update_data:
        user.online_status = payload.online_status
        updated_fields.append("online_status")

    return updated_fields


@router.get("/search")
async def search_users(
    q: str = Query(min_length=1, max_length=50),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    search_term = q.strip()
    if not search_term:
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    search_filter = {
        "$or": [
            {"username": {"$regex": search_term, "$options": "i"}},
            {"first_name": {"$regex": search_term, "$options": "i"}},
            {"last_name": {"$regex": search_term, "$options": "i"}},
        ]
    }
    users = await User.find(search_filter).limit(limit).to_list()
    results = [
        to_user_summary(user)
        for user in users
        if str(user.id) != str(current_user.id)
    ]
    logger.info(
        "Searched users actor_user_id=%s query=%s result_count=%s",
        current_user.id,
        search_term,
        len(results),
    )
    return results


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    logger.info("Fetched current user profile user_id=%s", current_user.id)
    return to_user_private(current_user)


@router.put("/me")
async def update_me(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    updated_fields = apply_user_updates(current_user, payload)
    current_user.updated_at = datetime.now(UTC)
    await current_user.save()
    logger.info("Updated current user profile user_id=%s fields=%s", current_user.id, updated_fields)
    return to_user_private(current_user)


@router.delete("/me")
async def delete_me(current_user: User = Depends(get_current_user)):
    await current_user.delete()
    logger.warning("Deleted current user account user_id=%s", current_user.id)
    return {"message": "User account deleted successfully."}


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    user = await User.get(user_id)
    if not user:
        logger.warning("Requested user not found requested_user_id=%s actor_user_id=%s", user_id, current_user.id)
        raise HTTPException(status_code=404, detail="User not found.")
    logger.info(
        "Fetched user profile requested_user_id=%s actor_user_id=%s visibility=%s",
        user_id,
        current_user.id,
        private_fields_for_actor(user, current_user),
    )
    return serialize_user_for_actor(user, current_user)


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    user = await User.get(user_id)
    if not user:
        logger.warning("Update target user not found requested_user_id=%s actor_user_id=%s", user_id, current_user.id)
        raise HTTPException(status_code=404, detail="User not found.")

    is_admin = current_user.role == UserRole.ADMIN
    is_self = str(current_user.id) == str(user.id)

    if not (is_admin or is_self):
        logger.warning("Unauthorized user update attempt target_user_id=%s actor_user_id=%s", user_id, current_user.id)
        raise HTTPException(status_code=403, detail="Not authorized.")

    updated_fields = apply_user_updates(user, payload)
    user.updated_at = datetime.now(UTC)
    await user.save()
    logger.info("Updated user target_user_id=%s actor_user_id=%s fields=%s", user.id, current_user.id, updated_fields)
    return serialize_user_for_actor(user, current_user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin),
):
    user = await User.get(user_id)
    if not user:
        logger.warning("Delete target user not found requested_user_id=%s admin_user_id=%s", user_id, current_user.id)
        raise HTTPException(status_code=404, detail="User not found.")

    await user.delete()
    logger.warning("Deleted user target_user_id=%s admin_user_id=%s", user_id, current_user.id)
    return {"message": "User deleted successfully."}


@router.put("/{user_id}/access")
async def update_user_access(
    user_id: str,
    payload: UserAccessUpdate,
    admin_user: User = Depends(require_admin),
):
    user = await User.get(user_id)
    if not user:
        logger.warning("Access update target user not found requested_user_id=%s admin_user_id=%s", user_id, admin_user.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found.",
            )
    
    user.role = payload.role
    user.updated_at = datetime.now(UTC)
    await user.save()
    logger.info("Updated user access target_user_id=%s admin_user_id=%s new_role=%s", user.id, admin_user.id, user.role)

    return {
        "message": "User access updated successfully.",
        "user_id": str(user.id),
        "username": user.username,
        "role": user.role,
    }

@router.post("/me/favorites/{place_id}")
async def add_favorite(place_id: str, current_user: User = Depends(get_current_user)):
    place = await Location.get(place_id)
    if not place:
        logger.warning("Favorite add failed because place was not found place_id=%s user_id=%s", place_id, current_user.id)
        raise HTTPException(status_code=404, detail="Place not found.")

    if place_id not in current_user.favorite_places:
        current_user.favorite_places.append(place_id)
        current_user.updated_at = datetime.now(UTC)
        await current_user.save()
        logger.info("Added favorite place_id=%s user_id=%s", place_id, current_user.id)
    else:
        logger.info("Favorite place already present place_id=%s user_id=%s", place_id, current_user.id)

    return {"message": "Favorite added.", "favorite_places": current_user.favorite_places}


@router.delete("/me/favorites/{place_id}")
async def remove_favorite(place_id: str, current_user: User = Depends(get_current_user)):
    place = await Location.get(place_id)
    if not place:
        logger.warning("Favorite remove failed because place was not found place_id=%s user_id=%s", place_id, current_user.id)
        raise HTTPException(status_code=404, detail="Place not found.")

    if place_id in current_user.favorite_places:
        current_user.favorite_places.remove(place_id)
        current_user.updated_at = datetime.now(UTC)
        await current_user.save()
        logger.info("Removed favorite place_id=%s user_id=%s", place_id, current_user.id)
    else:
        logger.warning("Attempted to remove missing favorite place_id=%s user_id=%s", place_id, current_user.id)

    return {"message": "Favorite removed.", "favorite_places": current_user.favorite_places}
