from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.user import User
from app.models.location import Location
from app.models.gathering import Gathering
from app.models.friendship import Friendship


client = AsyncIOMotorClient(settings.mongodb_url)
database = client[settings.mongodb_db_name]


async def init_db():
    await init_beanie(
        database=database,
        document_models=[
            User,
            Location,
            Gathering,
            Friendship,
        ],
    )