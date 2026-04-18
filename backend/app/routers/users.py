from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException, Depends
from starlette import status

from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.user import UserUpdateRequest, UserAccessUpdate

router = APIRouter(prefix="/users", tags=["users"])


def to_user_public(user: User):
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_image_url": user.profile_image_url,
        "favorite_places": user.favorite_places,
        "friend_ids": user.friend_ids,
        "preferences": user.preferences,
        "online_status": user.online_status,
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return to_user_public(current_user)


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    user = await User.find_one(User.id == user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return to_user_public(user)


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    admin_user: User = Depends(require_admin),
):
    user = await User.find_one(User.id == user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    user.updated_at = datetime.now(UTC)
    await user.save()
    return to_user_public(user)


@router.delete("/{user_id}")
async def delete_user(user_id: str, admin_user: User = Depends(require_admin)):
    user = await User.find_one(User.id == user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await user.delete()
    return {"message": "User account deleted successfully"}


@router.put("/me")
async def update_me(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)

    current_user.updated_at = datetime.now(UTC)
    await current_user.save()
    return to_user_public(current_user)


@router.delete("/me")
async def delete_me(current_user: User = Depends(get_current_user)):
    await current_user.delete()
    return {"message": "User account deleted successfully"}


@router.put("/{user_id}/access")
async def update_user_access(
    user_id: str,
    payload: UserAccessUpdate,
    admin_user: User = Depends(require_admin),
):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found",
            )
    
    if payload.role is not None:
        user.role = payload.role
    if payload.permissions is not None:
        user.permissions = payload.permissions

    await user.save()

    return {
        "message": "User access updated successfully",
        "user_id": str(user.id),
        "username": user.username,
        "role": user.role,
        "permissions": user.permissions,
    }

@router.post("/me/favorites/{place_id}")
async def add_favorite(place_id: str, current_user: User = Depends(get_current_user)):
    if place_id not in current_user.favorite_places:
        current_user.favorite_places.append(place_id)
        current_user.updated_at = datetime.now(UTC)
        await current_user.save()

    return {"message": "Favorite added", "favorite_places": current_user.favorite_places}


@router.delete("/me/favorites/{place_id}")
async def remove_favorite(place_id: str, current_user: User = Depends(get_current_user)):
    if place_id in current_user.favorite_places:
        current_user.favorite_places.remove(place_id)
        current_user.updated_at = datetime.now(UTC)
        await current_user.save()

    return {"message": "Favorite removed", "favorite_places": current_user.favorite_places}