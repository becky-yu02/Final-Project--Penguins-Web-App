from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt

from app.core.security import decode_access_token
from app.models.user import User, UserRole


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/penguins/auth/login")


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
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = await User.find_one(User.username == username)
    if user is None:
        raise credentials_exception

    return user

async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user