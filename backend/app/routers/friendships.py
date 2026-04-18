from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.models.friendship import Friendship
from app.models.user import User
from app.schemas.friendship import FriendRequestCreate

router = APIRouter(prefix="/friendships", tags=["friendships"])


@router.post("/request")
async def send_friend_request(
    payload: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
):
    requester_id = str(current_user.id)
    receiver_id = payload.receiver_id

    if requester_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    existing = await Friendship.find_one(
        {
            "$or": [
                {"requester_id": requester_id, "receiver_id": receiver_id},
                {"requester_id": receiver_id, "receiver_id": requester_id},
            ]
        }
    )

    if existing:
        raise HTTPException(status_code=400, detail="Friend request already exists")

    friendship = Friendship(
        requester_id=requester_id,
        receiver_id=receiver_id,
    )
    await friendship.insert()
    return {"message": "Friend request sent", "id": str(friendship.id)}


@router.get("")
async def list_friendships(current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    return await Friendship.find(
        {
            "$or": [
                {"requester_id": user_id},
                {"receiver_id": user_id},
            ]
        }
    ).to_list()


@router.post("/{friendship_id}/accept")
async def accept_friend_request(
    friendship_id: str,
    current_user: User = Depends(get_current_user),
):
    friendship = await Friendship.get(friendship_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friendship.receiver_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")

    friendship.status = "accepted"
    friendship.datetime_responded = datetime.now(UTC)
    friendship.updated_at = datetime.now(UTC)
    await friendship.save()

    if friendship.requester_id not in current_user.friend_ids:
        current_user.friend_ids.append(friendship.requester_id)
        await current_user.save()

    requester = await User.get(friendship.requester_id)
    if requester and str(current_user.id) not in requester.friend_ids:
        requester.friend_ids.append(str(current_user.id))
        await requester.save()

    return {"message": "Friend request accepted"}


@router.post("/{friendship_id}/decline")
async def decline_friend_request(
    friendship_id: str,
    current_user: User = Depends(get_current_user),
):
    friendship = await Friendship.get(friendship_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friendship.receiver_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to decline this request")

    friendship.status = "declined"
    friendship.datetime_responded = datetime.now(UTC)
    friendship.updated_at = datetime.now(UTC)
    await friendship.save()

    return {"message": "Friend request declined"}