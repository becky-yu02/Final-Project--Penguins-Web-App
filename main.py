from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from penguin_routes import router

app = FastAPI(title="Penguins")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/Penguins", tags=["Penguins"])