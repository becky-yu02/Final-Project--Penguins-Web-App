from datetime import datetime, UTC
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class GatheringVisibility(str, Enum):
    PUBLIC = "public"
    FRIENDS = "friends"
    PRIVATE = "private"


class GatheringStatus(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    ENDED = "ended"
    CANCELLED = "cancelled"


class Gathering(Document):
    host_user_id: str
    place_id: str
    datetime_start: datetime
    datetime_end: Optional[datetime] = None
    title: str
    description: Optional[str] = None
    visibility: GatheringVisibility = GatheringVisibility.PUBLIC
    status: GatheringStatus = GatheringStatus.SCHEDULED
    participant_user_ids: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "gatherings"
        indexes = [
            IndexModel("host_user_id"),
            IndexModel("status"),
        ]
