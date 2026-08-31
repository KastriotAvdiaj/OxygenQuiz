# OxygenQuiz

## Project Overview

OxygenQuiz is a full-stack quiz authoring and delivery platform composed of a Vite-powered React frontend and an ASP.NET Core Web API. The React client delivers the administrative and learner experience, while the .NET API handles authentication, quiz management, persistence, and the in-app AI features.

AI generation lives **in the backend**, not in a separate service: the `Ai` configuration section drives both AI quiz generation and the category-palette proposer through one OpenAI-compatible HTTP provider. See [`docs/quiz/ai-quiz-architecture.md`](docs/quiz/ai-quiz-architecture.md) and [`docs/entities/category-palettes.md`](docs/entities/category-palettes.md). The FastAPI service in `microservice/` predates that work, is **not wired into the application**, and is not deployed.

## Architecture

- **Frontend** – `src/` contains a React 18 + TypeScript application built with Vite and Tailwind. Axios clients centralize outbound HTTP traffic to the API and LLM endpoints.【F:src/lib/Api-client.ts†L1-L104】
- **Backend** – `OxygenBackend/QuizAPI` is a .NET 8 Web API project with Entity Framework Core, Hangfire background jobs, and JWT authentication helpers.【F:OxygenBackend/QuizAPI/QuizAPI.csproj†L1-L35】【F:OxygenBackend/QuizAPI/Services/AuthenticationService/AuthenticationService.cs†L13-L121】
- **Microservice** – `microservice/main.py` exposes a FastAPI app that fronts an Ollama runtime. It is **dormant**: nothing in the frontend or backend calls it, it is not built by any compose file, and it is not deployed. The AI features that shipped instead are in the backend's `Services/Ai` tree.【F:microservice/main.py†L1-L118】
- **Containerization** – The backend image is built from `OxygenBackend/QuizAPI/Dockerfile`; that is the one every compose file references and the one production runs. The root `Dockerfile` builds a frontend image that the live stack does not use — the SPA is deployed to Cloudflare Workers, not served from a container. See [`docs/deployment/production-topology.md`](docs/deployment/production-topology.md).

A high-level request flow is:

1. The React client calls the ASP.NET API for authentication, quiz CRUD, and reporting.
2. The API reads persistence and JWT configuration from `appsettings.*.json` and issues JWTs for the frontend.【F:OxygenBackend/QuizAPI/Services/AuthenticationService/AuthenticationService.cs†L111-L121】
3. (Future) The FastAPI service will expose LLM-backed helpers once the integration layer is extended to communicate with an LLM provider securely.【F:microservice/main.py†L41-L114】

## Prerequisites

Install the following tools before working with the project:

| Tool                    | Reason                                                                                                                                  | Notes                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Node.js 18+ & npm       | Required for the Vite dev server and build pipeline defined in `package.json`.【F:package.json†L1-L70】                                 | Install via nvm, Volta, or your package manager. |
| .NET SDK 8.0            | Builds and runs `OxygenBackend/QuizAPI` (`net8.0` target).【F:OxygenBackend/QuizAPI/QuizAPI.csproj†L3-L23】                             | Use `dotnet --list-sdks` to confirm.             |
| Python 3.11+ & pip      | Runs the FastAPI microservice and Ollama client imports.【F:microservice/main.py†L1-L118】                                              | Create a virtual environment for local work.     |
| Docker & Docker Compose | Builds and runs the local stack (`docker-compose.yml`) and the production backend image (`OxygenBackend/QuizAPI/Dockerfile`). | Required for production deploys.                 |
| mkcert (optional)       | Generates trusted local HTTPS certificates used by the Vite dev script.【F:vite.config.ts†L1-L18】【F:package.json†L7-L15】             | Install only if you need HTTPS locally.          |

## Quick Start

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/<org>/OxygenQuiz.git
   cd OxygenQuiz
   npm install
   dotnet restore OxygenBackend/QuizAPI/QuizAPI.csproj
   python -m venv .venv && source .venv/bin/activate && pip install fastapi uvicorn ollama
   ```
2. **Start the frontend (HTTPS dev server)**
   ```bash
   npm run dev
   ```
   The script enables HTTPS and points Vite at certificates in `./certs`. Use mkcert to generate `certs/cert.crt` and `certs/cert.key` if they are missing.【F:package.json†L7-L15】
3. **Configure backend secrets (first run only)**
   The API reads its JWT key, connection strings, and seed admin password from user-secrets — it
   will not start without them. See [Environment Configuration → Backend](#backend-oxygenbackendquizapiappsettingsjson)
   for the exact `dotnet user-secrets set` commands.
4. **Start the ASP.NET API**
   ```bash
   dotnet run --project OxygenBackend/QuizAPI
   ```
   The API listens on the default Kestrel ports (HTTPS `https://localhost:7153` in development).
5. **(Optional) Start the FastAPI microservice**

   ```bash
   uvicorn microservice.main:app --reload --port 8000
   ```

   Uvicorn matches the defaults baked into the axios `llmApi` client and the FastAPI `__main__` entry point.【F:src/lib/Api-client.ts†L33-L47】【F:microservice/main.py†L101-L118】

   ## Environment Configuration

### Frontend (`.env.development`, `.env.production`)

Vite loads these per-mode files automatically (`.env.development` for `npm run dev`, `.env.production` for `npm run build`). They hold **only non-secret** config — every `VITE_`-prefixed value is inlined into the public client bundle at build time — so both files **are committed** to the repo (only machine-specific `*.local` overrides are gitignored). If a variable is omitted, the client falls back to the hard-coded defaults in `src/lib/Api-client.ts`.

| Variable         | Description                                                                | Default/Fallback                                                                        | AWS Provisioning                                                                                    |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`   | Base URL for **all** backend (ASP.NET) API calls; set as the axios `baseURL`. | `https://localhost:7153/api` (see `src/lib/Api-client.ts`).【F:src/lib/Api-client.ts†L49-L104】 | Store in AWS Systems Manager Parameter Store (String) and inject into the frontend task definition. |
| `VITE_LLM_URL`   | Base URL for the FastAPI LLM microservice. **Currently disabled** (no LLM in use) — commented out in both env files. | `http://localhost:8000` (see `src/lib/Api-client.ts`).【F:src/lib/Api-client.ts†L33-L47】 | Leave unset until LLM integration is approved; then provide via Parameter Store as an HTTPS URL.    |
| `HTTPS`                 | Enables HTTPS for `npm run dev`.                        | `true` (set in package script).【F:package.json†L7-L15】                                         | Configure as an ECS task environment variable when HTTPS dev tooling is required.                   |
| `SSL_CERT_FILE`         | Path to the local certificate used by Vite.             | `./certs/cert.crt` (set in package script).【F:package.json†L7-L15】                             | Provide via Parameter Store referencing the mounted certificate path.                               |
| `SSL_KEY_FILE`          | Path to the local private key used by Vite.             | `./certs/cert.key` (set in package script).【F:package.json†L7-L15】                             | Provide via Parameter Store referencing the mounted certificate path.                               |

### Backend (`OxygenBackend/QuizAPI/appsettings.*.json`)

The committed `appsettings.json` holds **only non-secret configuration**. Secrets and connection
strings are **never committed** — they are supplied out-of-band:

- **Development:** [.NET user-secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets)
  (the project already has a `UserSecretsId`). Set them once:
  ```bash
  cd OxygenBackend/QuizAPI
  dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
  dotnet user-secrets set "ConnectionStrings:PostgresConnection" "Host=localhost;Port=5433;Database=OxygenQuiz;Username=postgres;Password=<your-local-pw>"
  dotnet user-secrets set "ConnectionStrings:MongoDBConnection" "mongodb://localhost:27017"
  dotnet user-secrets set "Seed:AdminPassword" "<your-local-admin-pw>"
  ```
- **Production:** environment variables. ASP.NET Core maps nested keys with a double underscore
  (`Jwt:Key` → `Jwt__Key`). Store them in AWS Secrets Manager / SSM Parameter Store (or your host's
  secret store) and inject into the container.

The app **fails fast at startup** if a required secret is missing — there are no hardcoded
fallbacks. [`appsettings.example.json`](OxygenBackend/QuizAPI/appsettings.example.json) is the
authoritative list of what must be provided.

| Key (`:` local / `__` env var) | Secret? | Where to set | Description |
| --- | --- | --- | --- |
| `ConnectionStrings:PostgresConnection` | **Yes** | user-secrets / env | Primary Postgres connection for EF Core **and** Hangfire (no separate Hangfire DB). |
| `ConnectionStrings:MongoDBConnection`  | **Yes** | user-secrets / env | MongoDB connection (lobby chat archive / chat features). |
| `Jwt:Key`                              | **Yes** | user-secrets / env | Symmetric JWT signing key (HS256). Must be ≥ 32 bytes and unique per environment. |
| `Seed:AdminPassword`                   | **Yes** | user-secrets / env | Password for the admin account seeded on first startup. |
| `Jwt:Issuer`                           | No      | `appsettings.json` | JWT issuer claim. |
| `Jwt:Audience`                         | No      | `appsettings.json` | JWT audience claim. |
| `MongoDB:DatabaseName`                 | No      | `appsettings.json` | MongoDB database name. |
| `Cors:AllowedOrigins`                  | No      | `appsettings.{env}.json` | Allowed frontend origins (array). |
| `Seed:AdminUsername` / `Seed:AdminEmail` | No    | `appsettings.{env}.json` | Admin account display fields. |

### FastAPI Microservice (`microservice/.env`)

Create a `.env` file in the `microservice/` directory (loaded by Uvicorn or dotenv tooling) to control runtime behavior.

| Variable           | Description                                                                        | Default/Fallback                                                          | AWS Provisioning                                                                  |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `LLM_MODEL`        | Ollama model name to load for chat/generation.                                     | `gemma3:12b` default inside `main.py`.【F:microservice/main.py†L41-L118】 | Parameter Store String (allows environment-specific models).                      |
| `PORT`             | HTTP port exposed by the service.                                                  | `8000` (used in `__main__`).【F:microservice/main.py†L101-L118】          | ECS task definition port mapping.                                                 |
| `OLLAMA_HOST`      | Optional URL to a remote Ollama runtime if not running locally.                    | Not set; Ollama defaults to localhost.                                    | Secrets Manager or Parameter Store depending on whether credentials are embedded. |
| `API_KEY` (future) | Placeholder for external LLM provider credentials once integration is implemented. | Not used yet; keep empty until the integration is built.                  | Secrets Manager with rotation policy.                                             |

All production secrets should be created as encrypted parameters or secrets, tagged by environment (e.g., `/oxygenquiz/prod/frontend/apiBaseUrl`) and injected into ECS task definitions or Lambda environment variables via AWS IAM task roles.

## Local Development Commands

- `npm run dev` – Launches the Vite dev server with HTTPS, Tailwind, and React Fast Refresh. The script injects `HTTPS`, `SSL_CERT_FILE`, and `SSL_KEY_FILE` for mkcert-trusted local development only.【F:package.json†L7-L15】
- `dotnet run --project OxygenBackend/QuizAPI` – Starts the ASP.NET Core API using the `net8.0` target and your current `appsettings.*.json` file.【F:OxygenBackend/QuizAPI/QuizAPI.csproj†L3-L24】
- `uvicorn microservice.main:app --reload --port 8000` – Runs the FastAPI microservice with live reload for local experimentation.【F:microservice/main.py†L101-L118】

## Production Build Commands

- `npm run build && npm run preview` – Produces a static build (`dist/`) and serves it locally for smoke tests before deployment.【F:package.json†L7-L15】
- `dotnet publish OxygenBackend/QuizAPI/QuizAPI.csproj -c Release` – Builds a Release artifact for deployment to IIS, Kestrel, or container images.【F:OxygenBackend/QuizAPI/QuizAPI.csproj†L3-L24】
- Frontend Docker image: `docker build -f Dockerfile -t oxygenquiz-frontend .` – Multi-stage build that compiles the Vite app and serves it via nginx.【F:Dockerfile†L1-L24】
- Backend Docker image: `docker build -f OxygenBackend/QuizAPI/Dockerfile -t oxygenquiz-backend OxygenBackend/QuizAPI` – Restores, publishes, and packages the ASP.NET API into an ASP.NET runtime image. In production this is built by the root `docker-compose.prod.yml` rather than by hand.

## Deployment

OxygenQuiz runs on a **Hetzner VPS + Cloudflare Workers** split, not on AWS. The authoritative
description — verified against the live server — is
[`docs/deployment/production-topology.md`](docs/deployment/production-topology.md). In short:

| Piece | Where it runs |
|---|---|
| Frontend SPA | **Cloudflare Workers** (`npm run build` + `wrangler deploy`) |
| API + PostgreSQL | **Hetzner VPS**, in Docker, via the root `docker-compose.prod.yml` |
| TLS / reverse proxy | **nginx**, a host system package on the VPS, proxying to `127.0.0.1:5000` |
| Secrets | `~/OxygenQuiz/.env.prod` on the VPS, referenced by `${...}` interpolation |

Day-to-day commands are in [`docs/deployment/cheatsheet.md`](docs/deployment/cheatsheet.md); the
configuration model is in [`docs/deployment/configuration.md`](docs/deployment/configuration.md).

> **Earlier revisions of this file described an AWS Fargate/ECS + S3/CloudFront target with ACM
> certificates.** That plan was never adopted and nothing in the repo implements it. It was removed
> rather than left standing, because a deployment section describing infrastructure that does not
> exist is worse than none. The `deploy/` directory holds a second, also-unadopted Caddy design —
> `production-topology.md` explains that one too.
