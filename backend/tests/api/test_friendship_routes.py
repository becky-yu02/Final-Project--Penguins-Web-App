import pytest
from types import SimpleNamespace

from app.models.user import User
from app.models.friendship import Friendship, FriendshipStatus
from app.main import app
from app.core.dependencies import get_current_user


# create second user
@pytest.fixture
async def other_user():
    user = User(
        username="otheruser",
        email="other@example.com",
        hashed_password="hashed",
        first_name="Other",
        last_name="User",
    )
    await user.insert()
    return user


# successfully send friend request
@pytest.mark.asyncio
async def test_send_friend_request(client, basic_user, other_user):
    response = await client.post(
        "/penguins/friendships/request",
        json={"receiver_id": str(other_user.id)},
    )

    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert data["message"] == "Friend request sent"


# error when friending yourself
@pytest.mark.asyncio
async def test_cannot_friend_self(client, basic_user):
    response = await client.post(
        "/penguins/friendships/request",
        json={"receiver_id": str(basic_user.id)},
    )

    assert response.status_code == 400


# duplicate friend request
@pytest.mark.asyncio
async def test_duplicate_friend_request(client, basic_user, other_user):
    payload = {"receiver_id": str(other_user.id)}

    await client.post("/penguins/friendships/request", json=payload)
    response = await client.post("/penguins/friendships/request", json=payload)

    assert response.status_code == 400


# successfully accept friend request; create request first
@pytest.mark.asyncio
async def test_accept_friend_request(client, basic_user, other_user):
    friendship = Friendship(
        requester_id=str(basic_user.id),
        receiver_id=str(other_user.id),
    )
    await friendship.insert()

    # override current user to receiver
    async def override_user():
        return other_user

    app.dependency_overrides[get_current_user] = override_user

    response = await client.post(f"/penguins/friendships/{friendship.id}/accept")

    assert response.status_code == 200

    updated = await Friendship.get(friendship.id)
    assert updated.status == FriendshipStatus.ACCEPTED

    # check to see if both users updated
    updated_receiver = await User.get(other_user.id)
    updated_requester = await User.get(basic_user.id)

    assert str(basic_user.id) in updated_receiver.friend_ids
    assert str(other_user.id) in updated_requester.friend_ids


# doesn't allow other users to accept request
@pytest.mark.asyncio
async def test_accept_forbidden(client, basic_user, other_user):
    friendship = Friendship(
        requester_id=str(basic_user.id),
        receiver_id=str(other_user.id),
    )
    await friendship.insert()

    response = await client.post(f"/penguins/friendships/{friendship.id}/accept")

    assert response.status_code == 403


# decline friend request
@pytest.mark.asyncio
async def test_decline_friend_request(client, basic_user, other_user):
    friendship = Friendship(
        requester_id=str(basic_user.id),
        receiver_id=str(other_user.id),
    )
    await friendship.insert()

    async def override_user():
        return other_user

    app.dependency_overrides[get_current_user] = override_user

    response = await client.post(f"/penguins/friendships/{friendship.id}/decline")

    assert response.status_code == 200

    updated = await Friendship.get(friendship.id)
    assert updated.status == FriendshipStatus.DECLINED


# get all friendships
@pytest.mark.asyncio
async def test_list_friendships(client, basic_user):
    response = await client.get("/penguins/friendships")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


#  get all pending requests
@pytest.mark.asyncio
async def test_get_pending_requests(client, basic_user, other_user):
    friendship = Friendship(
        requester_id=str(other_user.id),
        receiver_id=str(basic_user.id),
        status=FriendshipStatus.PENDING,
    )
    await friendship.insert()

    response = await client.get("/penguins/friendships/pending")

    assert response.status_code == 200
    data = response.json()

    assert any(f["status"] == "pending" for f in data)
