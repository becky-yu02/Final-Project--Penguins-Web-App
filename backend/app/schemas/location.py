from typing import Optional
from pydantic import BaseModel

from app.models.location import Coordinates


class PlaceCreateRequest(BaseModel):
    name: str
    address: str
    type_of_place: str
    coordinates: Optional[Coordinates] = None


class PlaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    type_of_place: Optional[str] = None
    coordinates: Optional[Coordinates] = None