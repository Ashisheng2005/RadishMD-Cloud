# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloud storage management service — users authenticate with an API key to browse directories, view file contents, manage connected devices, and organize directories with labels via a web UI.

## Architecture

Monorepo with two separate apps, no monorepo tooling:

```
/
├── backend/                      # FastAPI + uv (Python 3.11+)
│   ├── .env                      # STORAGE_API_KEYS, STORAGE_ROOT, DATABASE_URL
│   ├── pyproject.toml
│   ├── storage_data/             # Default storage root (git-committed sample files)
│   └── app/
│       ├── main.py               # FastAPI app entry, CORS (allows all origins), lifespan (DB init)
│       ├── config.py             # pydantic-settings (reads .env)
│       ├── database.py           # Async SQLAlchemy engine, session factory, Base, get_db
│       ├── models/
│       │   ├── device.py         # Device table (code, last_connected_at, last_address)
│       │   └── directory.py      # Directory table (path, label)
│       ├── routers/
│       │   ├── storage.py        # POST /api/auth/verify, GET /api/storage, GET /api/storage/content
│       │   ├── devices.py        # GET/POST/DELETE /api/devices
│       │   └── directories.py    # GET/POST/PUT/DELETE /api/directories
│       ├── services/
│       │   ├── auth.py           # verify_api_key() against configured keys
│       │   └── storage_service.py # list_directory(), read_file_content(), _resolve_safe_path()
│       └── middleware/
│           └── auth_middleware.py # require_auth FastAPI Depends (Bearer token)
├── frontend/                     # React 19 + Vite 8 + TypeScript 6 + shadcn/ui + Tailwind v4
│   ├── .env                      # VITE_API_URL=http://localhost:8001/api
│   ├── eslint.config.js          # Flat config: TS strict, react-hooks, react-refresh
│   ├── components.json           # shadcn/ui config (base-nova style, neutral color, lucide icons)
│   └── src/
│       ├── main.tsx              # React DOM entry (StrictMode)
│       ├── App.tsx               # AuthProvider -> DeviceProvider -> conditional routing
│       ├── index.css             # Tailwind v4 entry + shadcn CSS variables (light/dark)
│       ├── context/
│       │   ├── auth-context.tsx   # apiKey state + localStorage (key: radish_api_key)
│       │   └── device-context.tsx # selectedDeviceCode state + localStorage
│       ├── services/api.ts       # Generic request<T>() with Bearer + X-Device-Code headers
│       ├── hooks/use-storage.ts  # useDirectory(), useFileContent() (pass device code)
│       ├── types/index.ts        # StorageEntry, Device, Directory, AuthResponse, etc.
│       ├── components/
│       │   ├── LoginForm.tsx      # Card with password input + error alert
│       │   ├── FileExplorer.tsx   # Table with loading/empty/error states
│       │   ├── FileItem.tsx       # Single file/dir row with icon + badge
│       │   ├── BreadcrumbNav.tsx  # Clickable path segments (shadcn Breadcrumb)
│       │   ├── Sidebar.tsx       # Tab nav: File Explorer | Devices | Directories | API Reference
│       │   ├── DeviceSelector.tsx # Device code dropdown in header
│       │   └── ui/               # 10 shadcn/ui components (dialog, select, table, etc.)
│       └── pages/
│           ├── LoginPage.tsx
│           ├── DashboardPage.tsx  # Sidebar + header + tab-based content switching (4 tabs)
│           ├── DeviceManagementPage.tsx   # Device CRUD table + create input
│           ├── DirectoryManagementPage.tsx # Directory CRUD with dialogs + labels
│           └── ApiTutorialPage.tsx # API reference with inline docs + interactive "Try It" widgets
└── CLAUDE.md
```

## Frontend Component Architecture

- **State management**: Two React contexts (`AuthProvider`, `DeviceProvider`) wrapping the app in `App.tsx`. No state management library.
- **Data fetching**: `api.ts` provides a generic `request<T>()` function that auto-injects auth header and device code. Custom hooks (`use-storage.ts`) wrap API calls with loading/error state.
- **Error handling**: `ApiError` class carries HTTP status code. Every data-fetching component handles loading (spinner), empty (message + icon), and error (destructive Alert) states individually.
- **shadcn/ui components**: 10 standard components in `src/components/ui/`. The `<Select>` component is native `<select>` (not Radix-based). Also depends on `@base-ui/react ^1.4.1` as a direct dependency.

## Authentication Flow

1. User enters API key — `POST /api/auth/verify` — backend validates against `STORAGE_API_KEYS` env var (comma-separated)
2. On success, React context stores key in memory + `localStorage` (key: `radish_api_key`)
3. All subsequent requests include `Authorization: Bearer <key>` header via `api.ts:request()`
4. Backend CORS allows all origins (`["*"]`), no credentials

## Device Tracking Flow

- Storage endpoints (`GET /api/storage`, `GET /api/storage/content`) accept optional `X-Device-Code` header
- Backend `_track_device()` upserts the device record: sets `last_connected_at` and `last_address` from `request.client.host`
- Frontend `DeviceSelector` dropdown lists devices from `GET /api/devices`; selection stored in `DeviceContext` + `localStorage`
- `use-storage.ts` hooks read `selectedDeviceCode` from context and pass it to `api.listDirectory()` / `api.readFile()`

## Directory Labels

- `POST /api/directories` accepts both relative paths (resolved under `storage_root`) and absolute paths (used directly)
- `PUT /api/directories/{id}` updates only the label in the DB
- `DELETE /api/directories/{id}` removes only the DB record — files on disk are preserved
- `POST /api/directories` also creates the directory on disk via `mkdir(parents=True, exist_ok=True)`
- Path traversal protection via `_resolve_safe_path()` — absolute paths skip the storage-root-parent check

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/verify` | Body key | Validates `{ "api_key": "..." }` |
| GET | `/api/storage?path=/` | Bearer | List directory contents (+ optional X-Device-Code) |
| GET | `/api/storage/content?path=...` | Bearer | Read file content (+ optional X-Device-Code) |
| GET | `/api/devices` | Bearer | List all devices (ordered by updated_at DESC) |
| POST | `/api/devices` | Bearer | Create device `{ "code": "my-laptop" }` |
| DELETE | `/api/devices/{id}` | Bearer | Delete device |
| GET | `/api/directories` | Bearer | List all labeled directories |
| POST | `/api/directories` | Bearer | Create dir on disk + DB record — supports relative (`/docs`) and absolute (`E:/MyBlogs`) paths |
| PUT | `/api/directories/{id}` | Bearer | Update label `{ "label": "New Label" }` |
| DELETE | `/api/directories/{id}` | Bearer | Remove DB record (preserve filesystem dir) |

## Backend Service Notes

- **`_resolve_safe_path(path)`** in `storage_service.py`: resolves the path via `Path.resolve()`. For relative paths, validates the result is within `storage_root`. For absolute paths, no parent check is performed (the caller is trusted with filesystem access). Raises `PathTraversalError` on null bytes, invalid characters, or traversal attempts.
- **Binary detection**: File reads scan first 8192 bytes for null byte `\0`; returns `is_binary: true`
- **Large files**: Preview capped at 1MB with `truncated: true` flag
- **Device code**: Any valid string; backend upserts rather than pre-authorizing

## Database

- **Driver**: Async SQLAlchemy 2.0 with SQLite (`aiosqlite`) by default, MySQL (`aiomysql`) supported
- **Config**: `DATABASE_URL` env var in `backend/.env`
- **Migrations**: None — tables auto-created on startup via `Base.metadata.create_all()` in `database.py:init_db()`
- **Session**: `get_db()` async generator dependency, injected into route handlers via `Depends()`
- **Models**:
  - `Device`: id (int PK), code (str unique), last_connected_at (datetime), last_address (str), created_at, updated_at
  - `Directory`: id (int PK), path (str unique, 1024 chars), label (str 255 chars), created_at, updated_at

## Commands

### Backend
```bash
cd backend
uv sync                          # Install / sync Python dependencies
uv run uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm install                      # Install JS dependencies
npm run dev                      # Start Vite dev server (default port 5173)
npm run build                    # tsc -b && vite build (type check + production build)
npm run lint                     # ESLint flat config check
npx tsc -b --noEmit              # TypeScript type check only (no output = clean)
```

### Key Configs
- Backend port: `8001` (set via `uvicorn --port`)
- API keys: `STORAGE_API_KEYS=sk-admin,sk-readonly` in `backend/.env`
- Storage root: `STORAGE_ROOT=./storage_data` in `backend/.env`
- Database: `DATABASE_URL=sqlite+aiosqlite:///./radish.db` in `backend/.env`
- Frontend API base: `VITE_API_URL=http://localhost:8001/api` in `frontend/.env`
- Path alias `@/` -> `frontend/src/` (vite.config.ts + tsconfig.app.json)
- TypeScript 6: `tsconfig.app.json` uses `ignoreDeprecations: "6.0"` for baseUrl compat
- Tailwind v4: no config file — uses `@tailwindcss/vite` plugin + CSS-based `@import "tailwindcss"`
- CORS: backend allows all origins (`["*"]`), all methods, all headers, no credentials
- No tests exist in either backend or frontend
- Not a git repository — no version control history
