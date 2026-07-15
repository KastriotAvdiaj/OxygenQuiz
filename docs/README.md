# Getting Started — Required Software & Setup

This guide lists everything you need to install to run **OxygenQuiz** after cloning it
from Git, and walks through both the quick (Docker) and manual setup paths.

The project has four parts:

- **Frontend** — React 18 + Vite 5 (TypeScript) at the repo root (`src/`).
- **Backend API** — ASP.NET Core (.NET 8) in `OxygenBackend/QuizAPI`.
- **Database** — PostgreSQL (primary). *(MongoDB is currently disabled — multiplayer chat is
  ephemeral; see [`mongodb.md`](data/mongodb.md).)*
- **AI microservice** — optional Python/FastAPI + Ollama service in `microservice/` (LLM chat only).

---

## Required software

| Software | Version | Needed for | Notes |
|---|---|---|---|
| **Git** | any recent | Cloning the repo | — |
| **.NET SDK** | **8.0** | Building/running the API | `dotnet --version` should report 8.x |
| **Node.js** | **20 LTS** (18+ works) | Building/running the frontend | Vite 5 requires Node 18+; the Docker image uses Node 20 |
| **npm** | bundled with Node | Frontend dependencies | `package-lock.json` is committed — use `npm ci` for a clean install |
| **PostgreSQL** | **15** | Primary database | Schema **migrates and seeds automatically** on first API start |
| **MongoDB** | — | *Not needed* | **Disabled** — chat is ephemeral. Only required if you re-enable the persistent chat system ([`mongodb.md`](data/mongodb.md)) |
| **Docker + Docker Compose** | recent | *Optional* | One-command setup of databases + both apps |
| **An IDE** | — | Development | Visual Studio 2022 recommended for the backend; VS Code / Rider also fine |
| **Python** | 3.10+ | *Optional* | Only for the AI/LLM chat microservice |
| **Ollama** | latest | *Optional* | Local LLM runtime used by the microservice |

You do **not** need to install EF Core tools or run migrations by hand — the API applies
pending migrations and seeds reference data (roles, permissions, a default admin, and, in
Development, sample data) on startup.

> The data export/import feature adds two NuGet packages, **ClosedXML** and **CsvHelper**.
> These restore automatically on `dotnet restore` / first build — no manual step.

---

## Option A — Docker Compose (quickest)

Spins up PostgreSQL, the API, and the frontend together.

```bash
docker compose up --build
```

- Frontend → http://localhost:5173
- API → http://localhost:5000
- PostgreSQL → localhost:5432

The Postgres connection string is injected by `docker-compose.yml`, so no extra config is
needed for a first run.

---

## Option B — Run locally (without Docker)

### 1. Database

Have a PostgreSQL 15 server running. Connection strings and other secrets are **not** committed
to `appsettings.json` — supply them via .NET **user-secrets** for local dev (the project already
has a `UserSecretsId`). The app fails fast at startup if a required value is missing. At minimum:

```bash
cd OxygenBackend/QuizAPI
dotnet user-secrets set "ConnectionStrings:PostgresConnection" "Host=localhost;Port=5433;Database=OxygenQuiz;Username=postgres;Password=<your-pw>"
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
dotnet user-secrets set "Seed:AdminPassword" "<admin-pw>"
```

> MongoDB is disabled, so no `MongoDBConnection` is needed. See [`mongodb.md`](data/mongodb.md) if you
> re-enable the persistent chat system.

Note the default Postgres port here is **5433**, not the standard 5432. The full list of required
keys is in `OxygenBackend/QuizAPI/appsettings.example.json` (and the root README's "Backend" config
section). The `OxygenQuiz` database is created/migrated automatically the first time the API runs.

**Run the database in Docker (recommended):** a `docker-compose.dev.yml` at the repo root brings
up PostgreSQL with a host port that already matches `appsettings.json` (Postgres 5433) — no app
images, just the database:

```bash
docker compose -f docker-compose.dev.yml up -d     # start Postgres
docker compose -f docker-compose.dev.yml down      # stop
docker compose -f docker-compose.dev.yml down -v   # stop + delete data
```

### 2. Backend API

```bash
cd OxygenBackend/QuizAPI
dotnet restore
dotnet run
```

The API starts on **https://localhost:7153** (with `/api` as the route prefix) and applies
migrations + seeding on boot. Or open `OxygenBackend/QuizAPI/QuizAPI.sln` in Visual Studio
2022 and press F5.

### 3. Frontend

From the repo root:

```bash
npm ci          # or: npm install
npm run dev
```

The dev server runs at **https://localhost:5173**. The API base URL comes from
`.env.development` (`VITE_API_URL=https://localhost:7153/api`).

> **HTTPS dev certificate:** the `dev` script runs Vite with HTTPS and expects
> `./certs/cert.crt` and `./certs/cert.key`. The `certs/` folder ships PEM files under
> different names, so either provide `cert.crt` / `cert.key`, point the `SSL_CERT_FILE` /
> `SSL_KEY_FILE` values in the `dev` script at the existing files, or remove the
> `HTTPS=true ...` flags to run over plain HTTP during local development.

---

## First login

The seeder creates a default administrator account on first run, from `Seed:AdminUsername`
(in `appsettings.Development.json`) and `Seed:AdminPassword` (the user-secret you set above).
Change the password after your first sign-in.

## Optional — AI / LLM chat microservice

Only needed for the in-app LLM chat. It expects [Ollama](https://ollama.com) running locally.

```bash
cd microservice
pip install fastapi uvicorn ollama        # or use a requirements file if present
uvicorn main:app --port 8000
```

The frontend points at this service via `VITE_LLM_URL` (default `http://localhost:8000`). This
variable is **commented out in the committed env files** because the LLM feature is not currently used
in production — uncomment it (with an HTTPS URL in prod) only when running the microservice.

---

## Quick checklist

1. Install **.NET 8 SDK**, **Node 20**, and **PostgreSQL 15** (plus Docker if you prefer Option A).
2. Clone the repo.
3. Start PostgreSQL and set the connection string in `appsettings.json`.
4. `dotnet run` in `OxygenBackend/QuizAPI` → API on https://localhost:7153.
5. `npm ci && npm run dev` at the repo root → app on https://localhost:5173.
6. Sign in with the seeded admin account.
