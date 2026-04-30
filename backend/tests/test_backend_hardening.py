import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import jwt
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.authz import require_admin
from app.core.dependencies import check_note_permission, get_current_user
from app.models.gathering import GatheringStatus, GatheringVisibility
from app.models.friendship import FriendshipStatus
from app.models.location import CommunityNote, Location
from app.models.user import OnlineStatus, UserRole, UserPreferences
from app.routers.gatherings import update_gathering
from app.routers.users import update_me
from app.schemas.gathering import GatheringCreateRequest, GatheringUpdateRequest
from app.schemas.user import UserUpdateRequest


class DependencyAndAuthTests(unittest.IsolatedAsyncioTestCase):
    async def test_get_current_user_rejects_invalid_token(self):
        with patch(
            "app.core.dependencies.decode_access_token",
            side_effect=jwt.PyJWTError("bad token"),
        ):
            with self.assertRaises(HTTPException) as context:
                await get_current_user(token="bad-token")

        self.assertEqual(context.exception.status_code, 401)

    async def test_check_note_permission_rejects_non_owner(self):
        note = CommunityNote(note_id="note-1", user_id="owner-1", comment="hello")
        place = SimpleNamespace(community_notes=[note])
        current_user = SimpleNamespace(id="viewer-1", role=UserRole.BASIC)

        with patch("app.core.dependencies.Location.get", AsyncMock(return_value=place)):
            with self.assertRaises(HTTPException) as context:
                await check_note_permission(
                    place_id="place-1",
                    note_id="note-1",
                    current_user=current_user,
                )

        self.assertEqual(context.exception.status_code, 403)

    async def test_require_admin_rejects_basic_user(self):
        with self.assertRaises(HTTPException) as context:
            require_admin(current_user=SimpleNamespace(id="user-1", role=UserRole.BASIC))

        self.assertEqual(context.exception.status_code, 403)


class RouteBehaviorTests(unittest.IsolatedAsyncioTestCase):
    async def test_update_me_updates_only_allowed_fields(self):
        current_user = SimpleNamespace(
            id="user-1",
            username="alice",
            email="alice@example.com",
            role=UserRole.BASIC,
            first_name="Alice",
            last_name="Jones",
            profile_image_url=None,
            favorite_places=[],
            friend_ids=[],
            preferences=UserPreferences(),
            online_status=OnlineStatus(),
            updated_at=None,
            save=AsyncMock(),
        )
        payload = UserUpdateRequest(first_name="Alicia")

        result = await update_me(payload=payload, current_user=current_user)

        self.assertEqual(current_user.first_name, "Alicia")
        self.assertEqual(current_user.last_name, "Jones")
        current_user.save.assert_awaited_once()
        self.assertEqual(result["first_name"], "Alicia")
        self.assertEqual(result["last_name"], "Jones")

    async def test_update_gathering_requires_host(self):
        gathering = SimpleNamespace(
            id="gathering-1",
            host_user_id="host-1",
            datetime_start=None,
            datetime_end=None,
            title="Old",
            description=None,
            visibility=GatheringVisibility.PUBLIC,
            status=GatheringStatus.SCHEDULED,
            image_url=None,
            updated_at=None,
            save=AsyncMock(),
        )
        payload = GatheringUpdateRequest(title="New title")

        with patch("app.routers.gatherings.Gathering.get", AsyncMock(return_value=gathering)):
            with self.assertRaises(HTTPException) as context:
                await update_gathering(
                    gathering_id="gathering-1",
                    payload=payload,
                    current_user=SimpleNamespace(id="not-host"),
                )

        self.assertEqual(context.exception.status_code, 403)
        gathering.save.assert_not_awaited()


class EnumAndIndexTests(unittest.TestCase):
    @staticmethod
    def index_field_names(index_models):
        return {next(iter(index.document["key"].keys())) for index in index_models}

    def test_gathering_schema_rejects_invalid_visibility(self):
        with self.assertRaises(ValidationError):
            GatheringCreateRequest(
                place_id="place-1",
                datetime_start="2026-04-27T12:00:00Z",
                title="Lunch",
                visibility="hidden",
            )

    def test_gathering_update_schema_rejects_invalid_status(self):
        with self.assertRaises(ValidationError):
            GatheringUpdateRequest(status="paused")

    def test_status_enums_use_expected_values(self):
        self.assertEqual(FriendshipStatus.PENDING.value, "pending")
        self.assertEqual(GatheringStatus.ACTIVE.value, "active")
        self.assertEqual(GatheringVisibility.PRIVATE.value, "private")

    def test_index_configuration_covers_query_fields(self):
        location_indexes = self.index_field_names(Location.Settings.indexes)
        self.assertIn("type_of_place", location_indexes)

        from app.models.friendship import Friendship
        from app.models.gathering import Gathering

        friendship_indexes = self.index_field_names(Friendship.Settings.indexes)
        gathering_indexes = self.index_field_names(Gathering.Settings.indexes)

        self.assertIn("requester_id", friendship_indexes)
        self.assertIn("receiver_id", friendship_indexes)
        self.assertIn("host_user_id", gathering_indexes)
        self.assertIn("status", gathering_indexes)


if __name__ == "__main__":
    unittest.main()
