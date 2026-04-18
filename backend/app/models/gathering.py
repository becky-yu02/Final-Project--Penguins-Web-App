from datetime import datetime, UTC
from typing import List, Optional

from beanie import Document
from pydantic import Field


class Gathering(Document):
    host_user_id: str
    place_id: str
    datetime_start: datetime
    datetime_end: Optional[datetime] = None
    title: str
    description: Optional[str] = None
    visibility: str = "public"   # public, friends, private
    status: str = "scheduled"    # scheduled, active, ended, cancelled
    participant_user_ids: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "gatherings"