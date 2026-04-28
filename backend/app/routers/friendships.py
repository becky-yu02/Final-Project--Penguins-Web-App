import logging
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.models.friendship import Friendship, FriendshipStatus
from app.models.user import User, UserRole
from app.schemas.friendship import FriendRequestCreate

router = APIRouter(prefix="/friendships", tags=["friendships"])
logger = logging.getLogger(__name__)


@router.post("/request")
async def send_friend_request(
    payload: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
):
    requester_id = str(current_user.id)
    receiver_id = payload.receiver_id

    if requester_id == receiver_id:
        logger.warning("Friend request rejected because requester matched receiver user_id=%s", requester_id)
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    receiver = await User.get(receiver_id)
    if not receiver:
        logger.warning("Friend request rejected because receiver was not found receiver_id=%s requester_id=%s", receiver_id, requester_id)
        raise HTTPException(status_code=404, detail="Receiver not found")

    existing = await Friendship.find_one(
        {
            "$or": [
                {"requester_id": requester_id, "receiver_id": receiver_id},
                {"requester_id": receiver_id, "receiver_id": requester_id},
            ]
        }
    )

    if existing:
        logger.warning("Duplicate friend request rejected requester_id=%s receiver_id=%s", requester_id, receiver_id)
        raise HTTPException(status_code=400, detail="Friend request already exists")

    if receiver_id in current_user.friend_ids:
        logger.warning("Friend request rejected because users are already friends requester_id=%s receiver_id=%s", requester_id, receiver_id)
        raise HTTPException(status_code=400, detail="Users are already friends")

    friendship = Friendship(
        requester_id=requester_id,
        receiver_id=receiver_id,
    )
    await friendship.insert()
    logger.info("Friend request sent friendship_id=%s requester_id=%s receiver_id=%s", friendship.id, requester_id, receiver_id)
    return {"message": "Friend request sent", "id": str(friendship.id)}


@router.get("")
async def list_friendships(current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    friendships = await Friendship.find(
        {
            "$or": [
                {"requester_id": user_id},
                {"receiver_id": user_id},
            ]
        }
    ).to_list()
    logger.info("Listed friendships user_id=%s count=%s", user_id, len(friendships))
    return friendships


@router.get("/pending")
async def get_pending_requests(current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    pending_requests = await Friendship.find(
        {"receiver_id": user_id, "status": FriendshipStatus.PENDING}
    ).to_list()
    logger.info("Listed pending friend requests user_id=%s count=%s", user_id, len(pending_requests))
    return pending_requests


@router.post("/{friendship_id}/accept")
async def accept_friend_request(
    friendship_id: str,
    current_user: User = Depends(get_current_user),
):
    friendship = await Friendship.get(friendship_id)
    if not friendship:
        logger.warning("Accept target friendship not found friendship_id=%s actor_user_id=%s", friendship_id, current_user.id)
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friendship.receiver_id != str(current_user.id):
        logger.warning("Unauthorized friend request accept attempt friendship_id=%s actor_user_id=%s", friendship_id, current_user.id)
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")

    friendship.status = FriendshipStatus.ACCEPTED
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

    logger.info("Friend request accepted friendship_id=%s receiver_id=%s requester_id=%s", friendship.id, current_user.id, friendship.requester_id)
    return {"message": "Friend request accepted"}


@router.post("/{friendship_id}/decline")
async def decline_friend_request(
    friendship_id: str,
    current_user: User = Depends(get_current_user),
):
    friendship = await Friendship.get(friendship_id)
    if not friendship:
        logger.warning("Decline target friendship not found friendship_id=%s actor_user_id=%s", friendship_id, current_user.id)
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friendship.receiver_id != str(current_user.id):
        logger.warning("Unauthorized friend request decline attempt friendship_id=%s actor_user_id=%s", friendship_id, current_user.id)
        raise HTTPException(status_code=403, detail="Not authorized to decline this request")

    friendship.status = FriendshipStatus.DECLINED
    friendship.datetime_responded = datetime.now(UTC)
    friendship.updated_at = datetime.now(UTC)
    await friendship.save()

    logger.info("Friend request declined friendship_id=%s receiver_id=%s requester_id=%s", friendship.id, current_user.id, friendship.requester_id)
    return {"message": "Friend request declined"}
