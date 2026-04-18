from typing import Optional, List
from pydantic import BaseModel

from app.models.user import UserPreferences, OnlineStatus, UserRole, Permission


class UserPublic(BaseModel):
    id: str
    username: str
    email: str
    role: str
    first_name: str
    last_name: str
    profile_image_url: Optional[str] = None
    favorite_places: List[str]
    friend_ids: List[str]
    preferences: UserPreferences
    online_status: OnlineStatus


class UserAccessUpdate(BaseModel):
    role: Optional[UserRole] = None
    permissions: Optional[List[Permission]] = None
    

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    preferences: Optional[UserPreferences] = None
    online_status: Optional[OnlineStatus] = None