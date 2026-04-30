from datetime import datetime, UTC
from typing import List, Optional
from uuid import uuid4

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class Coordinates(BaseModel):
    lat: float
    lng: float


class CommunityNote(BaseModel):
    note_id: str = Field(default_factory=lambda: str(uuid4()))
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
        indexes = [
            IndexModel("type_of_place"),
        ]
