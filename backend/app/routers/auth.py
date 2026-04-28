import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends

from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest, LoginResponse
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    existing_username = await User.find_one(User.username == payload.username)
    if existing_username:
        logger.warning("Registration rejected for duplicate username=%s", payload.username)
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = await User.find_one(User.email == payload.email)
    if existing_email:
        logger.warning("Registration rejected for duplicate email=%s", payload.email)
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.BASIC,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )

    await user.insert()
    logger.info("User registered successfully user_id=%s username=%s", user.id, user.username)

    return {
        "message": "User successfully created",
        "user_id": str(user.id),
        "username": user.username,
        "role": user.role,
    }


@router.post("/login", response_model=LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await User.find_one(User.username == form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning("Failed login attempt for username=%s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(
        subject=user.username,
        )
    logger.info("User logged in successfully user_id=%s username=%s", user.id, user.username)
    return LoginResponse(access_token=token)
