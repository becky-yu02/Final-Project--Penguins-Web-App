from typing import Optional, List
from pydantic import BaseModel

from app.models.user import UserPreferences, OnlineStatus, UserRole


class UserSummary(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    profile_image_url: Optional[str] = None
    online_status: OnlineStatus


class UserPrivate(UserSummary):
    email: str
    role: str
    favorite_places: List[str]
    friend_ids: List[str]
    preferences: UserPreferences


class UserAccessUpdate(BaseModel):
    role: UserRole
    

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    preferences: Optional[UserPreferences] = None
    online_status: Optional[OnlineStatus] = None
