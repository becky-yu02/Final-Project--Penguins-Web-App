from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.places import router as places_router
from app.routers.gatherings import router as gatherings_router
from app.routers.friendships import router as friendships_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


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


@app.get("/")
async def root():
    return {"message": "Penguins API is running"}