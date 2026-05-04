# Mock Data

Demo data for populating the Penguins app in MongoDB. None of these documents are used by automated tests.

## Collections

| File | Collection | Count |
|---|---|---|
| `locations.json` | `locations` | 7 Iowa City spots |
| `gatherings.json` | `gatherings` | 5 gatherings (2 active, 3 scheduled) |
| `users.json` | `users` | 6 demo accounts |

## Recommended: use the seed script

You will need to have a properly configured `.env` file in `/backend` for `seed.py` to work.

The seed script handles everything in one shot, including real bcrypt password hashing for users:

```bash
# From the mock_data directory, with your backend virtualenv active:
MONGODB_URL="your_connection_string" MONGODB_DB_NAME="your_db_name" python seed.py
```

The script clears and re-inserts all three collections. All demo accounts get the password `password`.

**Dependencies** (`passlib`, `bcrypt`, and `pymongo` are already in `backend/requirements.txt`):
```bash
pip install passlib bcrypt pymongo
```

## Manual Compass import (locations & gatherings only)

`locations.json` and `gatherings.json` use MongoDB extended JSON and can be imported directly via MongoDB Compass (Add Data → Import JSON file). Import **locations first**, then gatherings.

> **Do not import `users.json` directly** — the `hashed_password` values are placeholders (`USE_SEED_PY`) and login will not work. Use `seed.py` for users.

## IDs

All IDs are fixed so cross-collection references stay consistent.

### Users
| ID | Username | Name | Role |
|---|---|---|---|
| `676f000000000000000000a1` | b3rrybunny | Bailey O | admin |
| `676f000000000000000000a2` | hawkeyefan99 | Jordan K | basic |
| `676f000000000000000000a3` | iowacity_dev | Sam T | basic |
| `676f000000000000000000a4` | riverside_reader | Morgan W | basic |
| `676f000000000000000000a5` | studybuddy_alex | Alex P | basic |
| `676f000000000000000000a6` | casey_codes | Casey L | basic |

### Locations
| ID | Name | Type |
|---|---|---|
| `676f000000000000000000b1` | Macbride Hall | study_space |
| `676f000000000000000000b2` | The Java House | cafe |
| `676f000000000000000000b3` | University of Iowa Main Library | library |
| `676f000000000000000000b4` | Iowa Memorial Union | student_union |
| `676f000000000000000000b5` | Prairie Lights Books | cafe |
| `676f000000000000000000b6` | Coralville Public Library | library |
| `676f000000000000000000b7` | Bruegger's Bagels | cafe |

### Gatherings
| ID | Title | Status | Visibility |
|---|---|---|---|
| `676f000000000000000000c1` | CS Study Group | active | public |
| `676f000000000000000000c2` | Coffee & Code | active | public |
| `676f000000000000000000c3` | Finals Prep Session | scheduled | public |
| `676f000000000000000000c4` | Group Project Meeting | scheduled | friends |
| `676f000000000000000000c5` | AI/ML Reading Group | scheduled | public |
