from datetime import datetime, UTC
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import Field, field_serializer
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

    @field_serializer('datetime_start', 'datetime_end', 'created_at', 'updated_at', when_used='json')
    def serialize_dt(self, v: Optional[datetime]) -> Optional[str]:
        if v is None:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=UTC)
        return v.isoformat().replace('+00:00', 'Z')

    class Settings:
        name = "gatherings"
        indexes = [
            IndexModel("host_user_id"),
            IndexModel("status"),
        ]
