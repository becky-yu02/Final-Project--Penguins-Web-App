import logging
from fastapi import Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

def require_authenticated_user(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user

def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        logger.warning("Admin authorization failed user_id=%s role=%s", current_user.id, current_user.role)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required."
        )
    return current_user

def ensure_owner_or_admin(
    owner_id: str,
    current_user: User,
) -> None:
    if current_user.role == UserRole.ADMIN:
        return

    if str(current_user.id) != str(owner_id):
        logger.warning("Owner or admin authorization failed owner_id=%s actor_user_id=%s", owner_id, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this resource."
        )
