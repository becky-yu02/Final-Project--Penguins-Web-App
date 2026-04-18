# Penguins API

A FastAPI + MongoDB backend for a location-based social application where users can register, authenticate, discover places, create gatherings, and manage friendships.

## Overview

This project implements a REST API for a social platform centered around **places** and **gatherings**. Authenticated users can:

- create and manage user profiles
- register and log in with JWT-based authentication
- create, update, and browse places
- add community notes to places
- create gatherings and join or leave them
- send, accept, and decline friend requests
- manage favorites and selected user settings

The application uses:

- **FastAPI** for the web framework
- **Beanie** as the ODM
- **MongoDB** as the database
- **Motor** for async MongoDB access
- **PyJWT** for token creation and validation
- **Passlib + bcrypt** for password hashing

## Tech Stack

- Python 3.11+ recommended
- FastAPI
- Beanie
- MongoDB
- Motor
- Pydantic v2
- PyJWT
- Uvicorn

## Project Structure

Based on the imports in the uploaded code, the intended package layout is:

```text
app/
├── main.py
├── core/
│   ├── config.py
│   ├── dependencies.py
│   └── security.py
├── db/
│   └── database.py
├── models/
│   ├── user.py
│   ├── location.py
│   ├── gathering.py
│   └── friendship.py
├── routers/
│   ├── auth.py
│   ├── users.py
│   ├── places.py
│   ├── gatherings.py
│   └── friendships.py
└── schemas/
    ├── auth.py
    ├── user.py
    ├── location.py
    ├── gathering.py
    └── friendship.py
```

## Features Implemented

### Authentication
- User registration
- Password hashing with bcrypt
- Login with OAuth2 password form
- JWT bearer token authentication
- Current-user lookup from token
- Admin-only dependency protection

### Users
- Get current user profile
- Get user by ID
- Update own profile
- Delete own account
- Admin update of another user
- Admin delete of another user
- Admin update of user role and permissions
- Add/remove favorite places

### Places
- Create place
- List all places
- Get place by ID
- Update place
- Add community note to a place

### Gatherings
- Create gathering
- List all gatherings
- List active gatherings
- Get gathering by ID
- Update gathering (host only)
- Join gathering
- Leave gathering

### Friendships
- Send friend request
- List friendship records for current user
- Accept friend request
- Decline friend request

## Data Models

### User
The user model includes:

- username
- email
- hashed_password
- role
- permissions
- first_name
- last_name
- profile_image_url
- favorite_places
- friend_ids
- preferences
- online_status
- created_at
- updated_at

### Location
The location model includes:

- name
- address
- type_of_place
- coordinates
- community_notes
- community_summary
- created_at
- updated_at

### Gathering
The gathering model includes:

- host_user_id
- place_id
- datetime_start
- datetime_end
- title
- description
- visibility
- status
- participant_user_ids
- image_url
- created_at
- updated_at

### Friendship
The friendship model includes:

- requester_id
- receiver_id
- status
- datetime_requested
- datetime_responded
- created_at
- updated_at

## Environment Variables

Create a `.env` file in the project root with:

```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=penguins
JWT_SECRET_KEY=replace_this_with_a_long_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

These are loaded through `BaseSettings` in `app/core/config.py`.

## Installation

1. Clone the repository.
2. Create and activate a virtual environment.
3. Install dependencies.
4. Configure environment variables.
5. Start MongoDB.
6. Run the API server.

### Create a virtual environment

```bash
python -m venv .venv
```

Activate it:

**macOS/Linux**
```bash
source .venv/bin/activate
```

**Windows (PowerShell)**
```powershell
.venv\Scripts\Activate.ps1
```

### Install dependencies

```bash
pip install -r requirements.txt
```

## Running the Application

From the project root, run:

```bash
uvicorn app.main:app --reload
```

The API should start locally at:

```text
http://127.0.0.1:8000
```

Useful endpoints:

- API root: `GET /`
- Swagger UI: `/docs`
- ReDoc: `/redoc`

## Authentication Flow

### Register

`POST /penguins/auth/register`

Example JSON body:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "strongpassword123",
  "first_name": "Alice",
  "last_name": "Smith"
}
```

### Login

`POST /penguins/auth/login`

This endpoint expects `application/x-www-form-urlencoded` data because it uses `OAuth2PasswordRequestForm`.

Example fields:

```text
username=alice
password=strongpassword123
```

Successful login returns a bearer token:

```json
{
  "access_token": "your.jwt.token",
  "token_type": "bearer"
}
```

Use it in authenticated requests:

```http
Authorization: Bearer <access_token>
```

## Main API Routes

### Auth
- `POST /penguins/auth/register`
- `POST /penguins/auth/login`

### Users
- `GET /penguins/users/me`
- `PUT /penguins/users/me`
- `DELETE /penguins/users/me`
- `GET /penguins/users/{user_id}`
- `PUT /penguins/users/{user_id}` (admin)
- `DELETE /penguins/users/{user_id}` (admin)
- `PUT /penguins/users/{user_id}/access` (admin)
- `POST /penguins/users/me/favorites/{place_id}`
- `DELETE /penguins/users/me/favorites/{place_id}`

### Places
- `POST /penguins/places`
- `GET /penguins/places`
- `GET /penguins/places/{place_id}`
- `PUT /penguins/places/{place_id}`
- `POST /penguins/places/{place_id}/notes`

### Gatherings
- `POST /penguins/gatherings`
- `GET /penguins/gatherings`
- `GET /penguins/gatherings/active`
- `GET /penguins/gatherings/{gathering_id}`
- `PUT /penguins/gatherings/{gathering_id}`
- `POST /penguins/gatherings/{gathering_id}/join`
- `POST /penguins/gatherings/{gathering_id}/leave`

### Friendships
- `POST /penguins/friendships/request`
- `GET /penguins/friendships`
- `POST /penguins/friendships/{friendship_id}/accept`
- `POST /penguins/friendships/{friendship_id}/decline`

## Development Notes

### CORS
CORS is currently configured for:

- `http://localhost:3000`
- `http://localhost:5173`

This supports common frontend development servers such as React and Vite.

### Database Initialization
MongoDB connection and Beanie model registration occur during the FastAPI lifespan startup event in `app.main`.

## Known Gaps / Limitations

At the current stage, the backend is functional but still fairly open and would benefit from additional production-hardening:

- limited authorization beyond admin checks and host checks
- several update routes allow broad field mutation
- no pagination on collection endpoints
- no filtering/search for places or gatherings
- no rate limiting
- no refresh token flow
- no centralized error response format
- no automated tests
- no logging or observability layer
- no Docker support
- no Alembic-style migration equivalent strategy for document evolution

## Suggested Improvements

### 1. Lock down authorization more carefully
Some routes are authenticated but not strongly authorized. For example, any authenticated user can currently update any place through `PUT /penguins/places/{place_id}` if they know the ID. That is likely too permissive. The same concern applies to place creation and some read/write patterns. Add role- or ownership-based authorization rules for each resource.

### 2. Prevent mass assignment on update routes
Several handlers apply:

```python
for key, value in update_data.items():
    setattr(model, key, value)
```

That pattern is concise, but it can become risky as schemas evolve. Consider explicit field-by-field updates or a service layer that validates which fields are mutable.

### 3. Fix user lookup by ID
Some code uses `User.find_one(User.id == user_id)`. With Beanie/MongoDB, ID handling can be error-prone when comparing raw strings to ObjectId-backed fields. Prefer `User.get(user_id)` where appropriate, or convert IDs consistently before querying.

### 4. Add response models to routes
Most endpoints return raw dictionaries or full Beanie documents. Adding `response_model=` for each route will:

- improve Swagger documentation
- prevent leaking internal fields accidentally
- make the API contract clearer
- help frontend integration

For example, avoid ever returning `hashed_password` by accident.

### 5. Separate schemas from persistence models more strictly
Right now the code mostly does this well, but some routes still return database objects directly. Introduce dedicated response schemas such as:

- `UserPublic`
- `PlaceResponse`
- `GatheringResponse`
- `FriendshipResponse`

This will make serialization safer and easier to maintain.

### 6. Add validation for cross-resource references
When creating a gathering, the API accepts `place_id` without first confirming the place exists. Similarly, friendship creation accepts `receiver_id` without verifying the target user exists before insert. Add integrity checks so invalid foreign-reference-like IDs do not accumulate.

### 7. Add delete and edit support for community notes
The current notes workflow only supports adding notes. Based on your earlier design discussion, the next logical step is:

- note author can edit or delete their own note
- admin can edit or delete any note

This would align the behavior with the ownership model you were aiming for.

### 8. Normalize status fields with enums
Fields like gathering visibility, gathering status, and friendship status are free-form strings. Convert them to `Enum` types to prevent invalid values and improve consistency.

### 9. Strengthen admin/permission model
The project has both `role` and `permissions`, but route protection currently relies almost entirely on `role == admin`. Decide whether permissions are decorative or enforceable. If enforceable, add permission-based dependencies such as:

- `require_permission(Permission.MANAGE_USERS)`
- `require_permission(Permission.EDIT_PENGUINS)`

### 10. Improve authentication ergonomics
The login endpoint uses `OAuth2PasswordRequestForm`, which is correct for Swagger OAuth2 flows, but it often confuses frontend developers who expect JSON. You can either:
- keep it and document it clearly, or
- add a JSON login endpoint for frontend convenience

Also consider adding:
- refresh tokens
- token revocation strategy
- password reset flow
- email verification

### 11. Add pagination and query filters
List endpoints like `/places`, `/gatherings`, and `/friendships` return everything. That will not scale well. Add query parameters such as:

- `skip`
- `limit`
- `status`
- `visibility`
- `type_of_place`
- search by name/address

### 12. Introduce a service layer
Routers currently contain both HTTP concerns and business logic. As the project grows, moving logic into services will help a lot:

- `auth_service.py`
- `user_service.py`
- `place_service.py`
- `gathering_service.py`
- `friendship_service.py`

That makes the code easier to test and reason about.

### 13. Add test coverage
At minimum, add tests for:

- registration and login
- invalid token handling
- admin-only route protection
- friendship accept/decline flow
- gathering host-only update rule
- self-service user update/delete
- place note creation and future note ownership rules

### 14. Add indexes based on query patterns
Unique indexes already exist for username and email. Consider adding indexes for commonly queried fields such as:

- `Friendship.requester_id`
- `Friendship.receiver_id`
- `Gathering.host_user_id`
- `Gathering.status`
- `Location.type_of_place`

## Recommended Next Steps

A practical order of improvement would be:

1. clean up repository structure
2. add response models everywhere
3. enforce ownership/authorization rules on all mutating routes
4. add note edit/delete endpoints with author/admin protection
5. add pagination and filtering
6. add tests
7. add Docker and deployment configuration