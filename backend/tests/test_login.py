import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from types import SimpleNamespace
from fastapi import HTTPException
from app.routers.auth import login


class AuthRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_login_success(self):
        # 1. Arrange
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.username = "testuser"
        mock_user.hashed_password = "hashed_secret"

        mock_form = SimpleNamespace(username="testuser", password="right-password")

        # Use create=True to bypass the "attribute not found" error
        with patch("app.models.user.User.username", MagicMock(), create=True), patch(
            "app.models.user.User.find_one", AsyncMock(return_value=mock_user)
        ):

            with patch("app.routers.auth.verify_password", return_value=True), patch(
                "app.routers.auth.create_access_token", return_value="fake-jwt-token"
            ):

            
                result = await login(form_data=mock_form)

        
        self.assertEqual(result.access_token, "fake-jwt-token")

    async def test_login_fails_wrong_password(self):
        mock_user = MagicMock()
        mock_user.username = "testuser"
        mock_user.hashed_password = "hashed_secret"
        mock_form = SimpleNamespace(username="testuser", password="wrong-password")

        with patch("app.models.user.User.username", MagicMock(), create=True), patch(
            "app.models.user.User.find_one", AsyncMock(return_value=mock_user)
        ):

            with patch("app.routers.auth.verify_password", return_value=False):
                with self.assertRaises(HTTPException) as context:
                    await login(form_data=mock_form)

        self.assertEqual(context.exception.status_code, 401)

    async def test_login_fails_user_not_found(self):
        mock_form = SimpleNamespace(username="ghost", password="any-password")

        with patch("app.models.user.User.username", MagicMock(), create=True), patch(
            "app.models.user.User.find_one", AsyncMock(return_value=None)
        ):

            with self.assertRaises(HTTPException) as context:
                await login(form_data=mock_form)

        self.assertEqual(context.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
