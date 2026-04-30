# Penguins API

A FastAPI + MongoDB backend for a location-based social application where users can register, authenticate, discover places, create gatherings, and manage friendships.

## Overview

This project implements a REST API for a social platform centered around places and gatherings. Authenticated users can:

- create and manage user profiles
- register and log in with JWT-based authentication
- create, update, and browse places
- add, edit, and delete community notes
- create gatherings and join or leave them
- send, accept, and decline friend requests
- manage favorites and selected user settings
- search users, places, and gatherings without manually entering IDs

The application uses:

- FastAPI for the web framework
- Beanie as the ODM
- MongoDB as the database
- Motor for async MongoDB access
- PyJWT for token creation and validation
- Passlib + bcrypt for password hashing

## Tech Stack

- Python 3.11+
- FastAPI
- Beanie
- MongoDB
- Motor
- Pydantic v2
- PyJWT
- Uvicorn

## Project Structure

```text
app/
├── main.py
├── core/
│   ├── authz.py
│   ├── bootstrap.py
│   ├── config.py
│   ├── dependencies.py
│   ├── logging.py
│   └── security.py
├── db/
│   └── database.py
├── models/
│   ├── friendship.py
│   ├── gathering.py
│   ├── location.py
│   └── user.py
├── routers/
│   ├── auth.py
│   ├── friendships.py
│   ├── gatherings.py
│   ├── places.py
│   └── users.py
├── schemas/
│   ├── auth.py
│   ├── friendship.py
│   ├── gathering.py
│   ├── location.py
│   ├── note.py
│   └── user.py
└── db/
    └── database.py

tests/
└── test_backend_hardening.py
```

## Features Implemented

### Authentication

- user registration
- password hashing with bcrypt
- login with OAuth2 password form
- JWT bearer token authentication
- current-user lookup from token
- admin-only dependency protection
- bootstrap admin creation/promotion on startup when configured

### Users

- get current user profile
- get user by ID
- search users by username or name
- update own profile
- delete own account
- admin delete of another user
- self/admin update of another user record
- admin update of user role
- add/remove favorite places
- privacy-aware profile serialization

### Places

- create place
- list all places
- search places by name, address, or type
- get place by ID
- update place
- add community note to a place
- get a community note
- edit/delete community notes with author/admin protection

### Gatherings

- create gathering
- list all gatherings
- search gatherings by title, description, visibility, or status
- list active gatherings
- get gathering by ID
- update gathering (host only)
- join gathering
- leave gathering

### Friendships

- send friend request
- list friendship records for current user
- list pending friend requests
- accept friend request
- decline friend request

### Logging

- centralized module-based logging with `logging.getLogger(__name__)`
- console logging via `StreamHandler`
- daily rotating file logging to `logs/penguins.log`
- request, authorization, route event, error, and startup/shutdown logging

## Data Models

### User

- `username`
- `email`
- `hashed_password`
- `role` (`basic` or `admin`)
- `first_name`
- `last_name`
- `profile_image_url`
- `favorite_places`
- `friend_ids`
- `preferences`
- `online_status`
- `created_at`
- `updated_at`

### Location

- `name`
- `address`
- `type_of_place`
- `coordinates`
- `community_notes`
- `community_summary`
- `created_at`
- `updated_at`

### Gathering

- `host_user_id`
- `place_id`
- `datetime_start`
- `datetime_end`
- `title`
- `description`
- `visibility` (`public`, `friends`, `private`)
- `status` (`scheduled`, `active`, `ended`, `cancelled`)
- `participant_user_ids`
- `image_url`
- `created_at`
- `updated_at`

### Friendship

- `requester_id`
- `receiver_id`
- `status` (`pending`, `accepted`, `declined`)
- `datetime_requested`
- `datetime_responded`
- `created_at`
- `updated_at`

## Environment Variables

Create a `.env` file in the project root with values like:

```env
MONGODB_URL=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=penguins_db
JWT_SECRET_KEY=replace_this_with_a_long_random_secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=change_this_admin_password
BOOTSTRAP_ADMIN_FIRST_NAME=Admin
BOOTSTRAP_ADMIN_LAST_NAME=User
```

Notes:

- `ACCESS_TOKEN_EXPIRE_MINUTES` is also accepted as an alias.
- if the `BOOTSTRAP_ADMIN_*` values are set, startup will create or promote that user to admin.

## Installation

1. Clone the repository.
2. Create and activate a virtual environment.
3. Install dependencies.
4. Configure environment variables.
5. Start MongoDB.
6. Run the API server.

### Create a virtual environment

```bash
python -m venv venv
```

Activate it:

macOS/Linux:

```bash
source venv/bin/activate
```

Windows (PowerShell):

```powershell
venv\Scripts\Activate.ps1
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

The API should start locally at `http://127.0.0.1:8000`.

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

- `GET /penguins/users/search?q=alice`
- `GET /penguins/users/me`
- `PUT /penguins/users/me`
- `DELETE /penguins/users/me`
- `GET /penguins/users/{user_id}`
- `PUT /penguins/users/{user_id}` (self or admin)
- `DELETE /penguins/users/{user_id}` (admin)
- `PUT /penguins/users/{user_id}/access` (admin)
- `POST /penguins/users/me/favorites/{place_id}`
- `DELETE /penguins/users/me/favorites/{place_id}`

### Places

- `POST /penguins/places`
- `GET /penguins/places`
- `GET /penguins/places/search?q=coffee`
- `GET /penguins/places/{place_id}`
- `PUT /penguins/places/{place_id}`
- `POST /penguins/places/{place_id}/notes`
- `GET /penguins/places/{place_id}/notes/{note_id}`
- `PUT /penguins/places/{place_id}/notes/{note_id}`
- `DELETE /penguins/places/{place_id}/notes/{note_id}`

### Gatherings

- `POST /penguins/gatherings`
- `GET /penguins/gatherings`
- `GET /penguins/gatherings/search?q=study`
- `GET /penguins/gatherings/active`
- `GET /penguins/gatherings/{gathering_id}`
- `PUT /penguins/gatherings/{gathering_id}`
- `POST /penguins/gatherings/{gathering_id}/join`
- `POST /penguins/gatherings/{gathering_id}/leave`

### Friendships

- `POST /penguins/friendships/request`
- `GET /penguins/friendships`
- `GET /penguins/friendships/pending`
- `POST /penguins/friendships/{friendship_id}/accept`
- `POST /penguins/friendships/{friendship_id}/decline`

## Development Notes

### CORS

CORS is currently configured for:

- `http://localhost:3000`
- `http://localhost:5173`

### Database Initialization

MongoDB connection and Beanie model registration occur during the FastAPI lifespan startup event in `app.main`. The bootstrap admin check also runs during startup.

### IDs and Search

The backend uses document IDs for cross-document operations, but provides search endpoints so users do not need to type IDs manually:

- `/penguins/users/search`
- `/penguins/places/search`
- `/penguins/gatherings/search`

## Testing

Run the backend hardening tests from the project root with either:

```bash
./venv/bin/python -m unittest discover -s tests -v
```

or:

```bash
./venv/bin/python -m pytest tests/test_backend_hardening.py -q
```

The current suite covers:

- invalid token handling
- admin-only route protection
- note ownership enforcement
- host-only gathering updates
- explicit self-service user updates
- enum validation
- index configuration checks

## Current Hardening Status

Already addressed in the backend:

- explicit field-by-field updates on the main mutable routes
- enum-backed gathering visibility/status and friendship status
- role-only admin authorization
- cross-resource reference validation for key flows
- note ownership enforcement
- search support for users, places, and gatherings
- centralized logging
- baseline backend hardening tests
- indexes for common query fields

Still open / worth improving:

- stronger ownership rules for some mutating routes, especially places
- pagination and richer filtering on list endpoints
- dedicated `response_model=` declarations across more routes
- broader end-to-end test coverage
- rate limiting
- refresh tokens / token revocation / password reset flows
- Docker and deployment configuration
- a document migration strategy for model evolution

## Recommended Next Steps

1. add response models across more routes
2. tighten ownership/authorization rules on remaining mutable endpoints
3. add pagination and filtering to large list endpoints
4. expand automated tests around full request/response flows
5. add Docker and deployment configuration
6. consider a service layer if the business logic continues to grow
