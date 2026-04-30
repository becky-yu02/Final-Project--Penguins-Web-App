import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette import status

from app.core.logging import configure_logging
from app.db.database import init_db
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.places import router as places_router
from app.routers.gatherings import router as gatherings_router
from app.routers.friendships import router as friendships_router

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup initiated")
    try:
        await init_db()
        logger.info("Database initialized successfully")
        yield
    except Exception:
        logger.critical("Application startup failed during database initialization", exc_info=True)
        raise
    finally:
        logger.info("Application shutdown complete")


app = FastAPI(title="Penguins", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/penguins")
app.include_router(users_router, prefix="/penguins")
app.include_router(places_router, prefix="/penguins")
app.include_router(gatherings_router, prefix="/penguins")
app.include_router(friendships_router, prefix="/penguins")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    client_host = request.client.host if request.client else "unknown"
    logger.info(
        "Request started: method=%s path=%s client=%s",
        request.method,
        request.url.path,
        client_host,
    )

    try:
        response = await call_next(request)
    except Exception:
        logger.error(
            "Unhandled exception: method=%s path=%s client=%s",
            request.method,
            request.url.path,
            client_host,
            exc_info=True,
        )
        raise

    level = "info"
    if response.status_code >= 500:
        level = "error"
    elif response.status_code >= 400:
        level = "warning"

    log_message = (
        "Request completed: method=%s path=%s status=%s client=%s"
    )
    getattr(logger, level)(
        log_message,
        request.method,
        request.url.path,
        response.status_code,
        client_host,
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.critical(
        "Critical application error on %s %s",
        request.method,
        request.url.path,
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.get("/")
async def root():
    logger.info("Root health endpoint accessed")
    return {"message": "Penguins API is running"}
