from bson import ObjectId
from fastapi import APIRouter, HTTPException
from backend.db_models import User, Location
from db_mongo import db_mongo

router = APIRouter()


@router.post("/register")
async def register(user: User):
    await db_mongo.users.insert_one(user.model_dump())
    return {"message": "User successfully created"}


@router.get("/users/{username}")
async def get_user(username: str):
    user = await db_mongo.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["_id"] = str(user["_id"])
    return user


@router.post("/places")
async def create_place(location: Location):
    place = await db_mongo.locations.insert_one(location.model_dump())
    return {"message": "Place created", "id": str(place.inserted_id)}


@router.get("/places")
async def get_places():
    places = []
    async for place in db_mongo.locations.find():
        place["_id"] = str(place["_id"])
        places.append(place)
    return places


@router.get("/places/{place_id}")
async def get_place(place_id: str):
    try:
        place = await db_mongo.locations.find_one({"_id": ObjectId(place_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    place["_id"] = str(place["_id"])
    return place
