import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import asyncio


@pytest.fixture(autouse=True)
def mock_beanie_init():
    """
    Automatically mock Beanie initialization for all tests.
    This prevents tests from trying to connect to a real MongoDB.
    """
    with patch("beanie.init_beanie", AsyncMock()):
        yield


@pytest.fixture(autouse=True)
def mock_user_model_attributes():
    """
    Automatically patch the User class attributes.
    This fixes the 'AttributeError: username' globally.
    """
    with patch("app.models.user.User.username", MagicMock(), create=True), patch(
        "app.models.user.User.email", MagicMock(), create=True
    ):
        yield


@pytest.fixture
def mock_user():
    """
    A reusable fixture to provide a fake user object.
    """
    user = MagicMock()
    user.id = "mock-user-id"
    user.username = "testpenguin"
    user.email = "test@example.com"
    user.hashed_password = "fake-hashed-password"
    user.role = "basic"
    return user
