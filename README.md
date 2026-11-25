# Sambandh Setu

> **Repository guide — `prod` branch**  
> A developer-oriented report of the application services, their connections, and how to build, run, and test them locally.

Sambandh Setu is a relationship-discovery and connection app. The client supports onboarding and profiles, discovering people, connection requests, connections and chat, notifications, and a stage-aware Setu Guide. The codebase is split into an Expo client, an Express API, and a FastAPI AI/guide service.

## Contents

- [System at a glance](#system-at-a-glance)
- [Services](#services)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Build and test](#build-and-test)
- [Configuration reference](#configuration-reference)
- [Deployment notes](#deployment-notes)
- [Known integration notes](#known-integration-notes)

## System at a glance

```text
Expo app (web / iOS / Android)
        │ HTTP + bearer token
        ▼
Express API :5000 ───────► SQLite (local) or PostgreSQL/Neon (configured)
        │ authenticated Setu Guide request
        ▼
FastAPI Setu Guide :8000 ─► mock/template response or configured LLM path
```

The frontend API helpers in `frontend/src/services/api.ts` call the Express API and add the saved session token to requests. The backend mounts auth, user/profile, discovery, request, connection, home, notification, chat, and guide routes from `backend/backend/server.js`. For Guide chat, the client calls `/guide/chat`; the backend authenticates and rate-limits the request, then its guide controller/service integrates with the separately deployable FastAPI service. In local development the backend can start a local Guide process; when deployed, configure the service URL instead.

## Services

### 1. Frontend — `frontend/`

- **Runtime:** Expo SDK 58, React Native 0.88, React 19, TypeScript. The same application targets web and native platforms.
- **Entrypoints:** `frontend/index.ts` registers `App.tsx`; `App.tsx` sets up fonts, the auth provider, error boundary, and `RootNavigator`.
- **Main areas:** `src/screens/` and `src/navigation/` provide screens and navigation; `src/context/` contains app context; `src/services/` contains API clients, local/mock data, and feature-specific data helpers; `assets/` contains app assets.
- **Backend integration:** `src/services/api.ts` reads `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_USE_MOCK`. `src/services/chatApi.ts` provides Guide and chat functions.

### 2. Backend API — `backend/backend/` (build/deploy context: `backend/`)

- **Runtime:** Express 5 on Node.js. Use Node 22 or later; the database adapter uses Node's `node:sqlite` API for local SQLite.
- **Entrypoint:** `server.js`. It configures Helmet, CORS, JSON parsing, rate limiting, health/readiness endpoints, routes, error handling, database startup, and shutdown.
- **Routes:** `/auth`, `/me` and `/users`, `/profiles` and `/profile`, `/discover`, `/requests`, `/connections`, `/home`, `/notifications`, `/chats`, and `/guide`.
- **Persistence:** `db/index.js` adapts SQLite or PostgreSQL. `config/db.js` initializes the schema and may seed a fresh non-test database. SQLite is the local fallback when no PostgreSQL URL is set.
- **Health checks:** `/health/live` is liveness; `/health` and `/health/ready` return readiness based on database initialization.
- **Deployment files:** `backend/Dockerfile` and `backend/render.yaml`. The Docker image runs `server.js` on port 5000.

### 3. Setu Guide AI API — `setu_ai/`

- **Runtime:** Python 3.11-compatible FastAPI/Uvicorn service.
- **Entrypoint:** `app.main:app` (re-exported from `app/api/main.py`).
- **Endpoints:** `GET /health`, `POST /v1/guide/chat`, and interactive API docs at `/docs`.
- **Responsibilities:** request/response validation, rate limiting and in-memory response caching, mock or orchestrator response handling, timeout fallback, and privacy-conscious request logging. It does not read the app database; the backend supplies the authorized request context.
- **Run/deploy files:** `requirements.txt`, `requirements-dev.txt`, `docker/`, and `docker-compose.yml`. Model and knowledge-base files are mounted at runtime rather than included in the container image.

## Repository layout

```text
.
├── backend/
│   ├── backend/       Express API source, routes, controllers, DB adapter, tests
│   ├── docs/          Backend runbook and deployment/operations documentation
│   ├── Dockerfile     Backend image (build context is this directory)
│   └── render.yaml    Render blueprint
├── frontend/
│   ├── src/           Screens, navigation, context, theme, and API/data services
│   ├── assets/        Expo app assets
│   ├── App.tsx        Root app component
│   └── package.json   Expo scripts and dependencies
└── setu_ai/
    ├── app/           FastAPI routes, config, schemas, orchestrator, RAG, safety
    ├── docker/        AI API image definition
    ├── docs/          AI API and integration documentation
    ├── tests/         Python tests (including failure/load test material)
    └── docker-compose.yml
```

## Requirements

- Git
- Node.js 22+ and npm
- Python 3.11+ and pip (for running the Guide API)
- Docker and Docker Compose are optional; used by the AI service's Compose setup and backend image
- PostgreSQL/Neon is optional for local backend development; without a PostgreSQL connection URL, the backend uses SQLite

## Run locally

Clone the `prod` branch, then use three terminals from the repository root. Start the AI API first so the backend can reach it.

### Terminal 1 — Guide API

```bash
cd setu_ai
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
# Use the deterministic mock/template path; no LLM key is needed.
USE_MOCK=true uvicorn app.main:app --reload --port 8000
```

On Windows PowerShell, set the mock variable for that shell before starting Uvicorn:

```powershell
$env:USE_MOCK = "true"
uvicorn app.main:app --reload --port 8000
```

Verify the service at <http://localhost:8000/health>; API docs are at <http://localhost:8000/docs>. Alternatively, from `setu_ai/`, run `docker compose up --build` and check `http://localhost:8000/health`.

### Terminal 2 — Backend API

```bash
cd backend/backend
cp .env.example .env
npm ci
npm run dev
```

Set `JWT_SECRET` in `backend/backend/.env` to a private random value of at least 32 characters. For a local-only run, the example config uses SQLite when `DATABASE_URL` is empty. The default local Guide address is `http://localhost:8000`; set `GUIDE_SERVICE_URL` to that value if your environment needs it explicitly. The API listens on port 5000 by default. Check readiness at <http://localhost:5000/health>.

`cp` is shown for macOS/Linux. On Windows PowerShell, use `Copy-Item .env.example .env`.

### Terminal 3 — Frontend

```bash
cd frontend
cp .env.example .env
npm ci
npm run start
```

Then use the Expo terminal to open the app on a device/emulator, or run `npm run web` for the web client. The checked-in `.env.example` points to the deployed API and sets mock mode off. To use the API running locally, set `EXPO_PUBLIC_API_URL=http://localhost:5000` and `EXPO_PUBLIC_USE_MOCK=false` in `frontend/.env`. For a physical device, use your computer's reachable LAN address instead of `localhost`. To run the UI without the backend, set `EXPO_PUBLIC_USE_MOCK=true` (mock mode does not exercise server persistence or server integrations).

## Build and test

### Frontend

```bash
cd frontend
npm run build       # export web build to dist
npm run build:apk   # EAS Android preview build; requires EAS setup
```

The package also provides `npm run android`, `npm run ios`, and `npm run web` for Expo development targets.

### Backend

```bash
cd backend/backend
npm test
npm run test:security
npm run test:ratelimit
npm run test:guide
```

Other targeted scripts are listed in `backend/backend/package.json`, including integration and end-to-end tests. Some integration tests require a configured test database or service; consult `backend/docs/RUNBOOK.md` and the test files before running them. `npm run build` invokes the backend `build.sh`; note that this script installs dependencies and attempts database seeding, rather than producing a compiled bundle.

### Guide API

```bash
cd setu_ai
pytest -q
```

For container-based Guide API checks, see `setu_ai/README.md` and `setu_ai/tests/README.md`. Load tests are separately documented and should use the mock path rather than consuming a real LLM quota.

## Configuration reference

| Component | Variable | Purpose |
|---|---|---|
| Frontend | `EXPO_PUBLIC_API_URL` | Express API base URL (default in code: `http://localhost:5000`) |
| Frontend | `EXPO_PUBLIC_USE_MOCK` | `true` uses client mock data; `false` calls configured API |
| Frontend | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Optional Google sign-in web client ID |
| Backend | `PORT` | HTTP port (defaults to `5000`) |
| Backend | `JWT_SECRET` | Required signing secret; at least 32 characters |
| Backend | `DATABASE_URL` / `NEON_DATABASE_URL` / `POSTGRES_URL` | PostgreSQL connection URL; when unset, backend uses SQLite |
| Backend | `SQLITE_DB_PATH` | Optional SQLite file path |
| Backend | `GUIDE_SERVICE_URL` | Guide API base URL; local Guide service uses port 8000 |
| Backend | `OTP_HMAC_SECRET` | Secret used by OTP-related functionality; configure for deployments |
| Backend | `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | Email provider configuration for email delivery |
| Backend | `CORS_ALLOW_ALL`, `CORS_ALLOWED_ORIGINS` | Cross-origin policy; tighten for production |
| Backend | `SENTRY_DSN` | Optional error monitoring |
| Guide API | `USE_MOCK` | `true` uses mock/template responses; `false` enables configured real-mode path |
| Guide API | `LLM_PROVIDER`, `LLM_API_KEY` / `GEMINI_API_KEY`, `GEMINI_MODEL` | Provider, secret, and model configuration for real mode |
| Guide API | `LLM_TIMEOUT_SECONDS` | LLM call timeout budget |
| Guide API | `RATE_LIMIT_PER_USER`, `RATE_LIMIT_PER_IP`, `TRUSTED_PROXY` | Request throttling and trusted proxy behavior |
| Guide API | `CACHE_ENABLED`, `CACHE_TTL_SECONDS`, `CACHE_MAX_ITEMS` | In-memory response cache configuration |

Use the component examples as starting points: `frontend/.env.example`, `backend/backend/.env.example`, and `setu_ai/.env.example`. Treat all example secrets and credentials as placeholders; never commit live secrets. Expo `EXPO_PUBLIC_*` values are shipped to the client and must not contain secrets.

## Deployment notes

- Deploy the frontend, Express API, and Guide API as independently configured services (or use the documented local process arrangement). Set the frontend's API URL to the deployed Express URL, and set the backend's Guide URL to the deployed Guide API URL.
- The backend Render blueprint is under `backend/render.yaml`; its Docker build context is `backend/`. Review the environment-variable names against the backend configuration before deploying.
- The AI service has its own Dockerfile and `docker-compose.yml` under `setu_ai/`. Follow `setu_ai/README.md` and `backend/docs/deploy-production.md` for service-specific details.
- Configure a strong `JWT_SECRET`, database URL, OTP/email provider secrets as needed, and production CORS origins in the deployment environment. Do not copy example placeholder values into production.
- AI service rate limiting and caching are in-memory. The AI service README documents the single-instance limitation and the need for shared infrastructure such as Redis when horizontally scaling those features.

## Known integration notes

These are important checks for anyone setting up the `prod` branch; they are not claims that a deployment has been tested here.

1. **Backend Render database variable:** `backend/render.yaml` currently lists `MONGODB_URI`, while the backend database initializer reads `DATABASE_URL`, `NEON_DATABASE_URL`, or `POSTGRES_URL` and supports SQLite/PostgreSQL. Set the variable the code actually consumes (for example `DATABASE_URL`) and reconcile the blueprint before deploying; the current backend adapter does not implement MongoDB.
2. **Guide API real-model path:** `setu_ai/.env.example` includes Gemini variables and `USE_MOCK=false`, but `setu_ai/app/api/main.py` describes real orchestrator integration as pending and the chat handler falls back safely if the real `handle_chat` entry is unavailable. Verify that path before relying on live LLM responses; mock mode is the straightforward local smoke test.
3. **Runtime environment is per service:** a root-level clone does not provide a single top-level install or start command. Install dependencies and configure environment separately in `frontend/`, `backend/backend/`, and `setu_ai/`.

## Further documentation

- Backend operations and troubleshooting: [`backend/docs/RUNBOOK.md`](backend/docs/RUNBOOK.md)
- Backend production deployment: [`backend/docs/deploy-production.md`](backend/docs/deploy-production.md)
- Backend staging deployment: [`backend/docs/deploy-staging.md`](backend/docs/deploy-staging.md)
- Guide API implementation and configuration: [`setu_ai/README.md`](setu_ai/README.md)
- Guide API contract: [`setu_ai/docs/api.md`](setu_ai/docs/api.md)
