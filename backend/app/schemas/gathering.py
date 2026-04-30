from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.gathering import GatheringStatus, GatheringVisibility


class GatheringCreateRequest(BaseModel):
    place_id: str
    datetime_start: datetime
    datetime_end: Optional[datetime] = None
    title: str
    description: Optional[str] = None
    visibility: GatheringVisibility = GatheringVisibility.PUBLIC
    image_url: Optional[str] = None


class GatheringUpdateRequest(BaseModel):
    datetime_start: Optional[datetime] = None
    datetime_end: Optional[datetime] = None
    title: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[GatheringVisibility] = None
    status: Optional[GatheringStatus] = None
    image_url: Optional[str] = None
