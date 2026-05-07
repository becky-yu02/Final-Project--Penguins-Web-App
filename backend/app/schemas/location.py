from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.location import Coordinates


class PlaceCreateRequest(BaseModel):
    name: str
    address: str
    type_of_place: str
    coordinates: Optional[Coordinates] = None
    photo_urls: List[str] = Field(default_factory=list)


class PlaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    type_of_place: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    photo_urls: Optional[List[str]] = None
    admin_approved: Optional[bool] = None


class AmenityOverrideRequest(BaseModel):
    wifi_available: Optional[bool] = None
    outlets_available: Optional[bool] = None
    parking_available: Optional[bool] = None
    food_available: Optional[bool] = None
