import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user
from app.models.user import User, UserRole

client = TestClient(app)


class UserApiTests(unittest.TestCase):
    def setUp(self):

        self.mock_user = MagicMock(spec=User)
        self.mock_user.id = "user-123"
        self.mock_user.username = "testpenguin"
        self.mock_user.email = "penguin@iceberg.com"
        self.mock_user.role = UserRole.BASIC
        self.mock_user.first_name = "Pingu"
        self.mock_user.last_name = "Penguin"
        self.mock_user.profile_image_url = "http://image.com"
        self.mock_user.online_status = "online"
        self.mock_user.favorite_places = []
        self.mock_user.friend_ids = []
        self.mock_user.preferences = {}

        # Dependency override
        app.dependency_overrides[get_current_user] = lambda: self.mock_user

    def tearDown(self):
        app.dependency_overrides = {}

    def test_get_me_api(self):
        response = client.get("/penguins/users/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "testpenguin")

    @patch("app.models.user.User.get")
    def test_get_other_user_public_view(self, mock_get):
        # 2. Setup the "other" user mock with all required attributes
        other_user = MagicMock(spec=User)
        other_user.id = "user-456"
        other_user.username = "stranger"
        other_user.first_name = "Stranger"
        other_user.last_name = "Penguin"
        other_user.profile_image_url = None
        other_user.online_status = "offline"

        other_user.email = "private@iceberg.com"

        mock_get.return_value = other_user

        response = client.get("/penguins/users/user-456")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Verify it's the summary view
        self.assertEqual(data["username"], "stranger")
        self.assertNotIn("email", data)
        self.assertNotIn("favorite_places", data)

    def test_update_me_api(self):
        payload = {"first_name": "UpdatedName"}
        self.mock_user.save = AsyncMock()

        response = client.put("/penguins/users/me", json=payload)

        self.assertEqual(response.status_code, 200)
        self.mock_user.save.assert_called_once()
