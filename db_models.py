from pydantic import BaseModel, Field
from typing import List


class User(BaseModel):
    username: str
    password: str # will be hashed later
    first_name: str
    last_name: str
    favorite_places: list[str] = Field(default_factory = list)

class Location(BaseModel):
    name: str
    address: str
    type_of_place: str
    community_notes: str