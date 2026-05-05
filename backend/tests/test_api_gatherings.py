import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta, UTC
from fastapi.testclient import TestClient
from app.main import app
from app.models.location import Location
from app.models.gathering import Gathering
from app.core.dependencies import get_current_user

client = TestClient(app)


class GatheringApiTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.base_url = "/penguins/gatherings"

        # Override Auth
        self.mock_user = MagicMock()
        self.mock_user.id = "penguin-123"
        app.dependency_overrides[get_current_user] = lambda: self.mock_user

        Gathering.get_motor_collection = MagicMock()
        Location.get_motor_collection = MagicMock()

    def tearDown(self):
        app.dependency_overrides.clear()

    @patch("app.routers.gatherings.Gathering")
    @patch("app.models.location.Location.get", new_callable=AsyncMock)
    async def test_create_gathering_success(self, mock_loc_get, mock_gathering_class):
        """
        By patching the Gathering class in the router, we bypass
        Beanie's initialization logic completely.
        """
        # 1. Setup location check
        mock_loc_get.return_value = MagicMock(spec=Location)

        # 2. Setup the instance that 'Gathering()' will return
        mock_instance = MagicMock()
        mock_instance.id = "mock-id"
        mock_instance.insert = AsyncMock(return_value=mock_instance)

        # Make the class call return instance
        mock_gathering_class.return_value = mock_instance

        payload = {
            "place_id": "iceberg-99",
            "datetime_start": (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
            "title": "Sardine Party",
            "visibility": "public",
        }

        response = client.post(f"{self.base_url}", json=payload)

        self.assertEqual(response.status_code, 200)
        # Verify mock instance was actually saved
        mock_instance.insert.assert_called_once()

    @patch("app.models.location.Location.get", new_callable=AsyncMock)
    async def test_create_gathering_location_not_found(self, mock_loc_get):
        mock_loc_get.return_value = None
        payload = {
            "place_id": "missing",
            "datetime_start": (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
            "title": "Ghost Party",
            "visibility": "public",
        }
        response = client.post(f"{self.base_url}", json=payload)
        self.assertEqual(response.status_code, 404)

    def test_create_gathering_invalid_payload(self):
        payload = {"title": "No Place ID"}
        response = client.post(f"{self.base_url}", json=payload)
        self.assertEqual(response.status_code, 422)
