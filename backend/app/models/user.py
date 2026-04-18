from datetime import datetime, UTC
from typing import List, Optional
from enum import Enum

from beanie import Document, Indexed
from pydantic import BaseModel, EmailStr, Field


class UserPreferences(BaseModel):
    max_distance_miles: Optional[float] = None
    wifi_required: bool = False
    outlets_required: bool = False
    parking_required: bool = False
    preferred_types: List[str] = Field(default_factory=list)


class OnlineStatus(BaseModel):
    is_online: bool = False
    broadcasting: bool = False
    current_gathering_id: Optional[str] = None


class UserRole(str, Enum):
    BASIC = "basic"
    ADMIN = "admin"


class Permission(str, Enum):
    VIEW_PENGUINS = "view_penguins"
    EDIT_PENGUINS = "edit_penguins"
    MANAGE_USERS = "manage_users"


class User(Document):
    username: Indexed(str, unique=True)
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    role: UserRole = UserRole.BASIC
    permissions: List[Permission] = Field(default_factory=list)
    first_name: str
    last_name: str
    profile_image_url: Optional[str] = None
    favorite_places: List[str] = Field(default_factory=list)
    friend_ids: List[str] = Field(default_factory=list)
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    online_status: OnlineStatus = Field(default_factory=OnlineStatus)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "users"