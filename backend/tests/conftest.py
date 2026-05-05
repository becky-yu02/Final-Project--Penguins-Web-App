import os
import pytest
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.main import app
from app.models.user import User, UserRole
from app.models.location import Location
from app.models.gathering import Gathering
from app.models.friendship import Friendship
from app.core.dependencies import get_current_user

TEST_DB_NAME = "test_db"
TEST_MONGODB_URL = os.getenv("TEST_MONGODB_URL", "mongodb://localhost:27017")


@pytest.fixture(scope="session")
async def test_db():
    client = AsyncIOMotorClient(TEST_MONGODB_URL)
    db = client[TEST_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[User, Location, Gathering, Friendship],
    )

    yield db

    await client.drop_database(TEST_DB_NAME)
    client.close()


async def override_get_current_user():
    return User(
        id="test-user-id",
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        role=UserRole.BASIC,
        first_name="Test",
        last_name="User",
    )


@pytest.fixture(scope="session")
async def client():
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def basic_user():
    user = User(
        username="basicuser",
        email="basic@example.com",
        hashed_password="hashed",
        role=UserRole.BASIC,
        first_name="Basic",
        last_name="User",
    )
    await user.insert()
    return user


@pytest.fixture
async def admin_user():
    user = User(
        username="adminuser",
        email="admin@example.com",
        hashed_password="hashed",
        role=UserRole.ADMIN,
        first_name="Admin",
        last_name="User",
    )
    await user.insert()
    return user
