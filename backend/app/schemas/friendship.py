from pydantic import BaseModel


class FriendRequestCreate(BaseModel):
    receiver_id: str