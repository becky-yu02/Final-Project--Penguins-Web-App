from typing import List, Optional
from pydantic import BaseModel


class CommunityNoteRequest(BaseModel):
    wifi_available: Optional[bool] = None
    outlets_available: Optional[bool] = None
    parking_available: Optional[bool] = None
    food_available: Optional[bool] = None
    rating: Optional[int] = None
    feel: Optional[List[str]] = None
    comment: Optional[str] = None
    image_url: Optional[str] = None


class NoteUpdate(BaseModel):
    wifi_available: Optional[bool] = None
    outlets_available: Optional[bool] = None
    parking_available: Optional[bool] = None
    food_available: Optional[bool] = None
    rating: Optional[int] = None
    feel: Optional[List[str]] = None
    comment: Optional[str] = None
    image_url: Optional[str] = None