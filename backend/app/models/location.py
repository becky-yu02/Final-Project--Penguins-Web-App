from datetime import datetime, UTC
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float
    lng: float


class CommunityNote(BaseModel):
    user_id: str
    wifi_available: Optional[bool] = None
    outlets_available: Optional[bool] = None
    parking_available: Optional[bool] = None
    comment: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CommunitySummary(BaseModel):
    wifi_available: Optional[bool] = None
    outlets_available: Optional[bool] = None
    parking_available: Optional[bool] = None
    overall_feel: Optional[str] = None
    overall_rating: Optional[float] = None


class Location(Document):
    name: str
    address: str
    type_of_place: str
    coordinates: Optional[Coordinates] = None
    community_notes: List[CommunityNote] = Field(default_factory=list)
    community_summary: CommunitySummary = Field(default_factory=CommunitySummary)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "locations"