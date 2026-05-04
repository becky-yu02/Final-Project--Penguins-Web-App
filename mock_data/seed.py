"""
Seed script for Penguins demo data.

Usage:
    cd mock_data
    python seed.py

Automatically loads backend/.env so no manual env-var setup is needed.
You can still override with environment variables if you want.

All demo accounts use the password: password
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from bson import ObjectId
from passlib.context import CryptContext
from pymongo import MongoClient

SCRIPT_DIR = Path(__file__).parent

# Load backend/.env — keeps credentials in one place, nothing to copy.
_env_file = SCRIPT_DIR.parent / "backend" / ".env"
if _env_file.exists():
    load_dotenv(_env_file)
    print(f"Loaded env from {_env_file}")
else:
    print(f"Warning: {_env_file} not found — falling back to environment variables.")

DEMO_PASSWORD = "password"
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "penguins")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def oid(hex_str: str) -> ObjectId:
    return ObjectId(hex_str)


def load_json(filename: str) -> list:
    path = SCRIPT_DIR / filename
    with open(path, "r") as f:
        return json.load(f)


def convert_extended_json(obj):
    """Recursively convert MongoDB extended JSON ($oid, $date) to BSON types."""
    if isinstance(obj, dict):
        if "$oid" in obj:
            return ObjectId(obj["$oid"])
        if "$date" in obj:
            return datetime.fromisoformat(obj["$date"].replace("Z", "+00:00"))
        return {k: convert_extended_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_extended_json(item) for item in obj]
    return obj


def upsert_all(collection, docs):
    upserted, modified = 0, 0
    for doc in docs:
        result = collection.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        upserted += result.upserted_id is not None
        modified += result.modified_count
    return upserted, modified


def upsert_users(collection, docs):
    # Match by username so we don't conflict with existing accounts that have
    # a different _id. $setOnInsert means existing users are never touched.
    inserted, skipped = 0, 0
    for doc in docs:
        result = collection.update_one(
            {"username": doc["username"]},
            {"$setOnInsert": doc},
            upsert=True,
        )
        if result.upserted_id is not None:
            inserted += 1
        else:
            skipped += 1
            print(f"  Skipped {doc['username']} — username already exists.")
    return inserted, skipped


def seed():
    print(f"Connecting to {MONGODB_URL} / {DB_NAME} ...")
    client = MongoClient(MONGODB_URL)
    db = client[DB_NAME]

    hashed_pw = pwd_context.hash(DEMO_PASSWORD)

    # ── Locations ──────────────────────────────────────────────────────────────
    locations = [convert_extended_json(doc) for doc in load_json("locations.json")]
    u, m = upsert_all(db.locations, locations)
    print(f"Locations:  {u} inserted, {m} updated.")

    # ── Gatherings ─────────────────────────────────────────────────────────────
    gatherings = [convert_extended_json(doc) for doc in load_json("gatherings.json")]
    u, m = upsert_all(db.gatherings, gatherings)
    print(f"Gatherings: {u} inserted, {m} updated.")

    # ── Users ──────────────────────────────────────────────────────────────────
    users = [convert_extended_json(doc) for doc in load_json("users.json")]
    for user in users:
        user["hashed_password"] = hashed_pw
    u, s = upsert_users(db.users, users)
    print(f"Users:      {u} inserted, {s} skipped (already exist).")

    print()
    print("Seeding complete! Any documents with different IDs were left untouched.")
    print(f"All demo accounts use the password: {DEMO_PASSWORD}")
    print()
    print("Demo accounts:")
    for user in users:
        print(f"  {user['username']:20s}  {user['email']}")


if __name__ == "__main__":
    seed()
