from datetime import datetime, UTC
from typing import Optional

from beanie import Document
from pydantic import Field


class Friendship(Document):
    requester_id: str
    receiver_id: str
    status: str = "pending"   # pending, accepted, declined
    datetime_requested: datetime = Field(default_factory=lambda: datetime.now(UTC))
    datetime_responded: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "friendships"