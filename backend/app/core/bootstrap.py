import logging

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole


logger = logging.getLogger(__name__)


async def ensure_initial_admin() -> None:
    if not settings.bootstrap_admin_username:
        logger.info("Initial admin bootstrap skipped because no bootstrap username was configured")
        return

    existing_admin = await User.find_one(User.username == settings.bootstrap_admin_username)
    if existing_admin:
        if existing_admin.role != UserRole.ADMIN:
            existing_admin.role = UserRole.ADMIN
            await existing_admin.save()
            logger.warning(
                "Existing bootstrap user was promoted to admin username=%s",
                existing_admin.username,
            )
        else:
            logger.info(
                "Initial admin bootstrap found existing admin username=%s",
                existing_admin.username,
            )
        return

    missing_fields = [
        field_name
        for field_name, value in {
            "bootstrap_admin_email": settings.bootstrap_admin_email,
            "bootstrap_admin_password": settings.bootstrap_admin_password,
            "bootstrap_admin_first_name": settings.bootstrap_admin_first_name,
            "bootstrap_admin_last_name": settings.bootstrap_admin_last_name,
        }.items()
        if not value
    ]
    if missing_fields:
        logger.warning(
            "Initial admin bootstrap skipped because required fields were missing fields=%s",
            ",".join(missing_fields),
        )
        return

    user = User(
        username=settings.bootstrap_admin_username,
        email=settings.bootstrap_admin_email,
        hashed_password=hash_password(settings.bootstrap_admin_password),
        role=UserRole.ADMIN,
        first_name=settings.bootstrap_admin_first_name,
        last_name=settings.bootstrap_admin_last_name,
    )
    await user.insert()
    logger.warning(
        "Initial admin user created username=%s user_id=%s",
        user.username,
        user.id,
    )
