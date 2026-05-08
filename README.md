# Penguins Web App

Penguins is a full-stack location-based social app for discovering useful places, creating gatherings, sharing community notes, seeing friend activity, and managing a small admin workflow for community-curated locations.

The project includes:

- a FastAPI + MongoDB API in `backend/`
- a React + Vite client in `frontend/`
- optional demo data and a seed script in `mock_data/`
- backend test coverage in `backend/tests/`

## Tech Stack

Backend:

- Python 3.11+
- FastAPI
- MongoDB
- Beanie ODM
- Motor async MongoDB driver
- Pydantic v2 and pydantic-settings
- JWT auth with PyJWT
- Passlib + bcrypt password hashing
- Uvicorn
- Pytest and HTTPX for tests

Frontend:

- React 19
- React Router 7
- Vite 8
- Bootstrap 5
- vite-plugin-svgr for SVG React components
- Google Maps JavaScript API
- Browser geolocation for distance and map context

## Main Features

- register and log in with JWT bearer tokens
- protected frontend routes and automatic logout when a saved token expires
- user profile editing, profile image upload, favorites, preferences, online status, and gathering broadcast status
- privacy-aware user serialization so other users only see public profile summaries
- friend search, outgoing friend requests, incoming request accept/decline, and accepted friend lists
- place discovery with Google Maps markers, type filters, favorites filter, match score sorting, friend-presence sorting, and walk-distance sorting
- place suggestions that remain pending until an admin approves them
- local image uploads for profile pictures and place photos
- community notes with amenities, ratings, vibes, comments, optional images, and automatic community summary recomputation
- admin amenity overrides for Wi-Fi, outlets, parking, and food availability
- gathering creation, visibility control, status automation, joining, leaving, cancelling, deleting, and active "here now" counts
- admin panel for approving/editing/geocoding places, reviewing/deleting notes, cancelling/deleting gatherings, and managing user roles/accounts
- centralized backend logging

## Screenshots
## Home Page
<img width="1918" height="990" alt="home" src="https://github.com/user-attachments/assets/fec7ec53-93f7-459c-9a24-86bb0bc44d7a" />
<img width="1918" height="996" alt="gatheing detail" src="https://github.com/user-attachments/assets/c90a566e-f69a-4274-a60c-ce65cf8dbbba" />

## Discovery Page
<img width="1918" height="995" alt="discovery" src="https://github.com/user-attachments/assets/f7a97803-2d83-4da7-975b-65dbacd0c983" />
<img width="1918" height="998" alt="place detail" src="https://github.com/user-attachments/assets/23e990b6-b6c9-43b2-bfbc-aa9b2d8a0845" />

## Gatherings Page
<img width="1918" height="992" alt="gatherings" src="https://github.com/user-attachments/assets/480c3c39-1efe-4703-9bd5-d6aa42965886" />

## Profile Page
<img width="1918" height="1000" alt="profile" src="https://github.com/user-attachments/assets/fd54b37b-c545-4a84-92d7-3795975d1bde" />

## Interactive Modals
<img width="641" height="887" alt="broadcast" src="https://github.com/user-attachments/assets/180473f6-5906-49b6-abf5-a07068718320" />
<img width="1918" height="1001" alt="add note" src="https://github.com/user-attachments/assets/dbae5743-e9b6-4314-bbbd-8c88278e5188" />


## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── core/          # config, auth helpers, logging, uploads, bootstrap
│   │   ├── db/            # MongoDB/Beanie initialization
│   │   ├── models/        # Beanie document models
│   │   ├── routers/       # auth, users, places, gatherings, friendships
│   │   ├── schemas/       # request/response validation models
│   │   └── main.py        # FastAPI app, middleware, static uploads
│   ├── tests/
│   ├── uploads/
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── utils/
│   ├── .env
│   ├── package.json
│   └── vite.config.js
├── mock_data/
├── pytest.ini
└── README.md
```

## Local Setup
### Prerequisites
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/en/download) 

#### Mac/Linux: replace `.venv\Scripts\activate` with `source .venv/bin/activate`

No ```.env``` setup necessary.

### Backend setup - Terminal 1
1. ```cd backend```
2. ```python -m venv .venv```
3. ```.venv\Scripts\activate```
4. ```pip install -r requirements.txt```
5. ```uvicorn app.main:app --reload```
### Frontend setup - Terminal 2
1. ```cd frontend```
2. ```npm install```
3. ```npm run dev```

#### Site should now be active at ```http://localhost:5173```.
##### Note to grader: Should you want to test admin features, log in with username TestAdmin and password TestAdmin.

## Frontend Routes

- `/login` - registration and login
- `/home` - active/upcoming gatherings, cancelled gatherings relevant to the user, favorite places, and map context
- `/discovery` - searchable/filterable place discovery, match scoring, friend presence, walk distance, favorites, and place suggestions
- `/gatherings` - create gatherings, browse visible gatherings, join/leave, cancel hosted gatherings, and broadcast "here now"
- `/profile` - profile details, edit profile modal, friends, incoming requests, friend search, favorites, and hosted gatherings
- `/settings` - older protected settings page that remains routable
- `/admin` - admin-only places, gatherings, and users management

## Backend API

All application API routes are prefixed with `/penguins`.

Auth:

- `POST /penguins/auth/register`
- `POST /penguins/auth/login`

Users:

- `GET /penguins/users` - admin only
- `GET /penguins/users/search?q=alice`
- `GET /penguins/users/me`
- `PUT /penguins/users/me`
- `POST /penguins/users/me/profile-picture`
- `DELETE /penguins/users/me`
- `GET /penguins/users/{user_id}`
- `PUT /penguins/users/{user_id}` - self or admin
- `DELETE /penguins/users/{user_id}` - admin only
- `PUT /penguins/users/{user_id}/access` - admin only
- `POST /penguins/users/me/favorites/{place_id}`
- `DELETE /penguins/users/me/favorites/{place_id}`

Places:

- `POST /penguins/places`
- `GET /penguins/places`
- `GET /penguins/places/search?q=coffee`
- `GET /penguins/places/{place_id}`
- `PUT /penguins/places/{place_id}`
- `POST /penguins/places/{place_id}/photos`
- `POST /penguins/places/{place_id}/recompute-summary` - admin only
- `POST /penguins/places/{place_id}/notes`
- `GET /penguins/places/{place_id}/notes/{note_id}`
- `PUT /penguins/places/{place_id}/notes/{note_id}` - note owner or admin
- `DELETE /penguins/places/{place_id}/notes/{note_id}` - note owner or admin
- `PUT /penguins/places/{place_id}/amenities` - admin only
- `DELETE /penguins/places/{place_id}/amenities` - admin only

Gatherings:

- `POST /penguins/gatherings`
- `GET /penguins/gatherings`
- `GET /penguins/gatherings/search?q=study`
- `GET /penguins/gatherings/active`
- `GET /penguins/gatherings/{gathering_id}`
- `PUT /penguins/gatherings/{gathering_id}` - host only
- `DELETE /penguins/gatherings/{gathering_id}` - host or admin
- `POST /penguins/gatherings/{gathering_id}/join`
- `POST /penguins/gatherings/{gathering_id}/leave`

Friendships:

- `POST /penguins/friendships/request`
- `GET /penguins/friendships`
- `GET /penguins/friendships/pending`
- `POST /penguins/friendships/{friendship_id}/accept`
- `POST /penguins/friendships/{friendship_id}/decline`

Static files:

- `GET /uploads/{path}`

## Authentication Flow

Register:

```http
POST /penguins/auth/register
Content-Type: application/json
```

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "strongpassword123",
  "first_name": "Alice",
  "last_name": "Smith"
}
```

Login:

```http
POST /penguins/auth/login
Content-Type: application/x-www-form-urlencoded
```

```text
username=alice
password=strongpassword123
```

Successful login returns:

```json
{
  "access_token": "your.jwt.token",
  "token_type": "bearer"
}
```

Use the token on protected requests:

```http
Authorization: Bearer <access_token>
```

## Data Model Overview

User documents store login identity, role, profile details, profile image URL, favorite place IDs, friend IDs, preference filters, online status, and timestamps.

Location documents store name, address, place type, optional coordinates, photo URLs, community notes, computed community summaries, optional admin amenity overrides, approval status, and timestamps.

Community notes are embedded in locations and store author ID, amenity opinions, rating, vibes, comment, optional image URL, and creation time.

Gathering documents store host user ID, place ID, start/end times, title, description, visibility, status, participants, optional image URL, and timestamps. Status can be `scheduled`, `active`, `ended`, or `cancelled`; visibility can be `public`, `friends`, or `private`.

Friendship documents store requester, receiver, status, request/response times, and timestamps. Status can be `pending`, `accepted`, or `declined`.

## Uploads

The backend accepts image uploads and stores them locally under `backend/uploads/`.

Supported image types:

- JPEG
- PNG
- GIF
- WebP

Maximum file size:

- 5 MB

Upload endpoints:

- `POST /penguins/users/me/profile-picture`
- `POST /penguins/places/{place_id}/photos`

Both endpoints require authentication and expect multipart form data with a `file` field.

## Mock Data

`mock_data/` contains DEPRECATED demo fixtures plus `seed.py`. It does NOT populate the database with the current versions of data models. It is only included for posterity.

From `mock_data/`, with backend dependencies installed:

```bash
MONGODB_URL="your_connection_string" MONGODB_DB_NAME="your_db_name" python seed.py
```

The script clears and re-inserts demo `users`, `locations`, and `gatherings` collections. Demo accounts use the password `password`.

## Logging

Backend logging is configured in `app.core.logging`.

Logs are written to:

```text
backend/logs/penguins.log
```

Request middleware logs request start/completion, warnings for 4xx responses, errors for 5xx responses, and critical details for unhandled exceptions.

## Testing And Verification

Backend compile check:

```bash
venv/bin/python -m compileall backend/app
```

Backend tests:

```bash
venv/bin/python -m pytest backend/tests -q
```

Frontend lint:

```bash
cd frontend
npm run lint
```

Frontend build:

```bash
cd frontend
npm run build
```
