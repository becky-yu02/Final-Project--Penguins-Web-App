# Penguins Web App

Penguins is a full-stack location-based social app for discovering places, creating gatherings, sharing community notes, managing friends, and maintaining user preferences.

The app has:

- a FastAPI + MongoDB backend in `backend/`
- a React + Vite frontend in `frontend/`
- optional mock seed data in `mock_data/`

## Tech Stack

Backend:

- Python 3.11 or newer
- FastAPI
- MongoDB
- Beanie ODM
- Motor
- Pydantic v2
- PyJWT
- Passlib + bcrypt
- Uvicorn

Frontend:

- React 19
- React Router
- Vite
- Bootstrap
- Google Maps JavaScript API integration

## Main Features

- user registration and login with JWT bearer tokens
- profile management, profile image upload, and privacy-aware user serialization
- admin role support and bootstrap admin creation
- place discovery with map markers, search, filters, favorites, and match scoring
- place suggestions with admin approval
- community notes with ratings, amenities, vibes, comments, and uploaded photos
- gathering creation, editing, deletion, joining, and leaving
- friend requests, pending requests, accepts, and declines
- local image uploads served from the backend
- centralized backend logging

## Screenshots
<img width="641" height="887" alt="Screenshot 2026-05-07 142201" src="https://github.com/user-attachments/assets/180473f6-5906-49b6-abf5-a07068718320" />
<img width="1918" height="1000" alt="Screenshot 2026-05-07 142144" src="https://github.com/user-attachments/assets/fd54b37b-c545-4a84-92d7-3795975d1bde" />
<img width="1918" height="992" alt="Screenshot 2026-05-07 142129" src="https://github.com/user-attachments/assets/480c3c39-1efe-4703-9bd5-d6aa42965886" />
<img width="1918" height="998" alt="Screenshot 2026-05-07 142101" src="https://github.com/user-attachments/assets/23e990b6-b6c9-43b2-bfbc-aa9b2d8a0845" />
<img width="1918" height="996" alt="Screenshot 2026-05-07 141951" src="https://github.com/user-attachments/assets/c90a566e-f69a-4274-a60c-ce65cf8dbbba" />
<img width="1918" height="995" alt="Screenshot 2026-05-07 125226" src="https://github.com/user-attachments/assets/f7a97803-2d83-4da7-975b-65dbacd0c983" />
<img width="1918" height="990" alt="Screenshot 2026-05-07 124725" src="https://github.com/user-attachments/assets/fec7ec53-93f7-459c-9a24-86bb0bc44d7a" />
<img width="1918" height="1001" alt="Screenshot 2026-05-07 142229" src="https://github.com/user-attachments/assets/dbae5743-e9b6-4314-bbbd-8c88278e5188" />


## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── authz.py
│   │   │   ├── bootstrap.py
│   │   │   ├── config.py
│   │   │   ├── dependencies.py
│   │   │   ├── logging.py
│   │   │   ├── security.py
│   │   │   └── uploads.py
│   │   ├── db/
│   │   ├── models/
│   │   ├── routers/
│   │   └── schemas/
│   ├── tests/
│   ├── uploads/
│   ├── logs/
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── mock_data/
```

## Environment Variables

The backend loads environment variables from `backend/.env`.

Create `backend/.env`:

```env
MONGODB_URL=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=penguins_db
JWT_SECRET_KEY=replace_this_with_a_long_random_secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Optional bootstrap admin variables:

```env
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=change_this_admin_password
BOOTSTRAP_ADMIN_FIRST_NAME=Admin
BOOTSTRAP_ADMIN_LAST_NAME=User
```

If all bootstrap admin values are provided, startup will create that user or promote the existing matching username to admin.

The frontend reads the Google Maps API key from Vite environment variables. Create `frontend/.env` if map features need Google Maps:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Local Setup

Start MongoDB first. With Homebrew on macOS:

```bash
brew services start mongodb-community
```

Create and activate the backend virtual environment from the project root:

```bash
python -m venv venv
source venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

If password hashing fails with a bcrypt/passlib error, make sure the pinned bcrypt version is installed:

```bash
pip install bcrypt==4.0.1
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

## Running The App

Terminal 1, from the project root:

```bash
source venv/bin/activate
uvicorn app.main:app --reload --app-dir backend
```

The backend runs at:

```text
http://127.0.0.1:8000
```

Useful backend pages:

- API root: `http://127.0.0.1:8000/`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

Terminal 2:

```bash
cd frontend
npm run dev
```

The frontend usually runs at:

```text
http://localhost:5173
```

## Uploads

The backend accepts image uploads and stores them locally under `backend/uploads/`.

Supported image types:

- JPEG
- PNG
- GIF
- WebP

Maximum file size:

- 5 MB

Uploaded files are served from:

```text
http://127.0.0.1:8000/uploads/...
```

Upload endpoints:

- `POST /penguins/users/me/profile-picture`
- `POST /penguins/places/{place_id}/photos`

Both endpoints require authentication and expect multipart form data with a `file` field.

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

## API Routes

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
- `POST /penguins/places/{place_id}/notes`
- `GET /penguins/places/{place_id}/notes/{note_id}`
- `PUT /penguins/places/{place_id}/notes/{note_id}`
- `DELETE /penguins/places/{place_id}/notes/{note_id}`

Gatherings:

- `POST /penguins/gatherings`
- `GET /penguins/gatherings`
- `GET /penguins/gatherings/search?q=study`
- `GET /penguins/gatherings/active`
- `GET /penguins/gatherings/{gathering_id}`
- `PUT /penguins/gatherings/{gathering_id}` - host only
- `DELETE /penguins/gatherings/{gathering_id}` - host only
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

## Data Models

User:

- `username`
- `email`
- `hashed_password`
- `role`
- `first_name`
- `last_name`
- `profile_image_url`
- `favorite_places`
- `friend_ids`
- `preferences`
- `online_status`
- `created_at`
- `updated_at`

Location:

- `name`
- `address`
- `type_of_place`
- `coordinates`
- `photo_urls`
- `community_notes`
- `community_summary`
- `admin_approved`
- `created_at`
- `updated_at`

Community note:

- `note_id`
- `user_id`
- `wifi_available`
- `outlets_available`
- `parking_available`
- `food_available`
- `rating`
- `feel`
- `comment`
- `image_url`
- `created_at`

Gathering:

- `host_user_id`
- `place_id`
- `datetime_start`
- `datetime_end`
- `title`
- `description`
- `visibility`
- `status`
- `participant_user_ids`
- `image_url`
- `created_at`
- `updated_at`

Friendship:

- `requester_id`
- `receiver_id`
- `status`
- `datetime_requested`
- `datetime_responded`
- `created_at`
- `updated_at`

## Frontend Pages

- `/login` - register and login
- `/home` - favorite places and gathering activity
- `/discovery` - search/filter places, view map, suggest places
- `/gatherings` - create, edit, join, leave, and delete gatherings
- `/profile` - profile, friends, favorites, hosted gatherings, profile editing
- `/settings` - older direct settings page, still routable but not linked in the main navigation
- `/admin` - admin-only management for places, gatherings, and users

## Logging

Backend logging is configured in `app.core.logging`.

Logs are written to:

```text
backend/logs/penguins.log
```

When the server is launched from another working directory, a `logs/penguins.log` folder may also appear relative to that working directory.

## Testing And Verification

Backend compile check:

```bash
venv/bin/python -m compileall backend/app
```

Backend tests:

```bash
venv/bin/python -m pytest backend/tests -q
```

If that command reports `No module named pytest`, install the backend requirements into the active virtual environment:

```bash
pip install -r backend/requirements.txt
```

Frontend build:

```bash
cd frontend
npm run build
```
