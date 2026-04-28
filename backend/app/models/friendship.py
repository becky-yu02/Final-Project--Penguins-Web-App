from datetime import datetime, UTC
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class FriendshipStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class Friendship(Document):
    requester_id: str
    receiver_id: str
    status: FriendshipStatus = FriendshipStatus.PENDING
    datetime_requested: datetime = Field(default_factory=lambda: datetime.now(UTC))
    datetime_responded: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "friendships"
        indexes = [
            IndexModel("requester_id"),
            IndexModel("receiver_id"),
        ]
