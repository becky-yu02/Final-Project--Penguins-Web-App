import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt

from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.models.location import Location


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/penguins/auth/login")
logger = logging.getLogger(__name__)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        username: str | None = payload.get("sub")
        if username is None:
            logger.warning("Access token missing subject")
            raise credentials_exception
    except jwt.PyJWTError:
        logger.warning("Access token decoding failed")
        raise credentials_exception

    user = await User.find_one(User.username == username)
    if user is None:
        logger.warning("Access token resolved to missing user username=%s", username)
        raise credentials_exception

    return user


async def check_note_permission(
    place_id: str,
    note_id: str,
    current_user: User = Depends(get_current_user)
) -> Location:
    """Check if user can modify the note (owner or admin) and return the place."""
    place = await Location.get(place_id)
    if not place:
        logger.warning("Note permission check failed because place was not found place_id=%s actor_user_id=%s", place_id, current_user.id)
        raise HTTPException(status_code=404, detail="Place not found")

    # Find the note
    note = next((n for n in place.community_notes if n.note_id == note_id), None)
    if not note:
        logger.warning("Note permission check failed because note was not found place_id=%s note_id=%s actor_user_id=%s", place_id, note_id, current_user.id)
        raise HTTPException(status_code=404, detail="Note not found")

    # Check permission: owner or admin
    if note.user_id != str(current_user.id) and current_user.role != UserRole.ADMIN:
        logger.warning("Unauthorized note modification attempt place_id=%s note_id=%s actor_user_id=%s", place_id, note_id, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this note"
        )

    return place
