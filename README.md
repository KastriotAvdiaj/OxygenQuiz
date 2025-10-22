# OxygenQuiz

## Project Overview

OxygenQuiz is a full-stack quiz authoring and delivery platform composed of a Vite-powered React frontend, an ASP.NET Core Web API, and an experimental FastAPI microservice for LLM-powered assistance. The React client delivers the administrative and learner experience, while the .NET API handles authentication, quiz management, and persistence. A FastAPI service (`microservice/main.py`) is included for future natural-language features, but it is **not currently wired into the application** because it still needs additional work to proxy requests to an LLM provider securely.【F:src/lib/Api-client.ts†L33-L74】【F:microservice/main.py†L1-L118】

## Architecture

- **Frontend** – `src/` contains a React 18 + TypeScript application built with Vite and Tailwind. Axios clients centralize outbound HTTP traffic to the API and LLM endpoints.【F:src/lib/Api-client.ts†L1-L104】
- **Backend** – `OxygenBackend/QuizAPI` is a .NET 8 Web API project with Entity Framework Core, Hangfire background jobs, and JWT authentication helpers.【F:OxygenBackend/QuizAPI/QuizAPI.csproj†L1-L35】【F:OxygenBackend/QuizAPI/Services/AuthenticationService/AuthenticationService.cs†L13-L121】
- **Microservice** – `microservice/main.py` exposes a FastAPI app that fronts an Ollama runtime. The service exports `/chat` and `/generate` endpoints but is not invoked by the frontend or backend yet.【F:microservice/main.py†L1-L118】
- **Containerization** – Dockerfiles exist for the frontend (`Dockerfile`) and backend (`OxygenBackend/Dockerfile`) to support containerized development and deployment workflows.【F:Dockerfile†L1-L24】【F:OxygenBackend/Dockerfile†L1-L26】

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
| Docker & Docker Compose | Builds the frontend and backend containers defined by the repo Dockerfiles.【F:Dockerfile†L1-L24】【F:OxygenBackend/Dockerfile†L1-L26】 | Required for ECS/Fargate deployments.            |
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
3. **Start the ASP.NET API**
   ```bash
   dotnet run --project OxygenBackend/QuizAPI
   ```
   The API listens on the default Kestrel ports (HTTPS `https://localhost:7153` in development).
4. **(Optional) Start the FastAPI microservice**

   ```bash
   uvicorn microservice.main:app --reload --port 8000
   ```

   Uvicorn matches the defaults baked into the axios `llmApi` client and the FastAPI `__main__` entry point.【F:src/lib/Api-client.ts†L33-L47】【F:microservice/main.py†L101-L118】

   ## Environment Configuration

### Frontend (`.env`, `.env.production`)

Define Vite environment variables to override the default axios base URLs and HTTPS behavior. If an environment variable is omitted, the client falls back to the hard-coded defaults in `src/lib/Api-client.ts` and the dev script in `package.json`.

| Variable                | Description                                             | Default/Fallback                                                                                 | AWS Provisioning                                                                                    |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | Base URL for the ASP.NET API consumed by `apiService`.  | `https://localhost:7153/api/` (see `src/lib/Api-client.ts`).【F:src/lib/Api-client.ts†L49-L104】 | Store in AWS Systems Manager Parameter Store (String) and inject into the frontend task definition. |
| `VITE_LLM_API_BASE_URL` | Base URL for the FastAPI microservice used by `llmApi`. | `http://localhost:8000` (see `src/lib/Api-client.ts`).【F:src/lib/Api-client.ts†L33-L47】        | Use Parameter Store; omit in production until LLM integration is approved.                          |
| `HTTPS`                 | Enables HTTPS for `npm run dev`.                        | `true` (set in package script).【F:package.json†L7-L15】                                         | Configure as an ECS task environment variable when HTTPS dev tooling is required.                   |
| `SSL_CERT_FILE`         | Path to the local certificate used by Vite.             | `./certs/cert.crt` (set in package script).【F:package.json†L7-L15】                             | Provide via Parameter Store referencing the mounted certificate path.                               |
| `SSL_KEY_FILE`          | Path to the local private key used by Vite.             | `./certs/cert.key` (set in package script).【F:package.json†L7-L15】                             | Provide via Parameter Store referencing the mounted certificate path.                               |

### Backend (`OxygenBackend/QuizAPI/appsettings.*.json`)

Populate the following sections in each environment-specific settings file (`appsettings.Development.json`, `appsettings.Production.json`, etc.). Use ASP.NET Core user secrets locally for sensitive values and AWS Secrets Manager in production.

| Section / Key                 | Description                                                                  | Usage                                                                                                                                                                                                                | AWS Provisioning                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `ConnectionStrings:SqlServer` | Primary SQL Server or Azure SQL connection string for Entity Framework Core. | Consumed when configuring `ApplicationDbContext` (EF models live in `OxygenBackend/QuizAPI/Data`).【F:OxygenBackend/QuizAPI/Data/ApplicationDbContext.cs†L1-L118】【F:OxygenBackend/QuizAPI/QuizAPI.csproj†L14-L24】 | Store in AWS Secrets Manager as `SecureString` and reference from ECS task + RDS.      |
| `ConnectionStrings:Hangfire`  | Optional Hangfire SQL connection string if a dedicated database is used.     | Required by background jobs configured via Hangfire services.                                                                                                                                                        | Store in Secrets Manager or Parameter Store depending on sensitivity.                  |
| `Jwt:Key`                     | Symmetric signing key for JWT issuance.                                      | Used by `AuthenticationService.GenerateJwtToken`.【F:OxygenBackend/QuizAPI/Services/AuthenticationService/AuthenticationService.cs†L101-L121】                                                                       | Secrets Manager (rotation supported) injected as environment variable or mounted file. |
| `Jwt:Issuer`                  | JWT issuer claim.                                                            | Used during token creation.【F:OxygenBackend/QuizAPI/Services/AuthenticationService/AuthenticationService.cs†L111-L118】                                                                                             | Parameter Store (String) or Secrets Manager when bundled with `Jwt:Key`.               |
| `Jwt:Audience`                | JWT audience claim.                                                          | Used during token creation.【F:OxygenBackend/QuizAPI/Services/AuthenticationService/AuthenticationService.cs†L115-L118】                                                                                             | Parameter Store (String) or Secrets Manager when bundled with `Jwt:Key`.               |
| `MongoDb:ConnectionString`    | Optional MongoDB connection string for the `MongoDbSettings` POCO.           | Provide if MongoDB-backed features are enabled.【F:OxygenBackend/QuizAPI/MongoDB/MongoDbSettings.cs†L1-L8】                                                                                                          | Secrets Manager or Parameter Store based on usage.                                     |
| `MongoDb:DatabaseName`        | MongoDB database name.                                                       | Used with `MongoDbSettings`.【F:OxygenBackend/QuizAPI/MongoDB/MongoDbSettings.cs†L1-L8】                                                                                                                             | Parameter Store (String).                                                              |

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
- Backend Docker image: `docker build -f OxygenBackend/Dockerfile -t oxygenquiz-backend .` – Restores, publishes, and packages the ASP.NET API into an ASP.NET runtime image.【F:OxygenBackend/Dockerfile†L1-L26】

## Deployment (AWS)

The recommended target environment is AWS Fargate on ECS with supporting managed services. For the React client we standardize on **Option A** (static hosting via S3 + CloudFront) to minimize operational overhead while still enabling global TLS termination through ACM-managed certificates:

1. **Frontend** – Build the static bundle with `npm run build`, upload the generated `dist/` directory to an S3 bucket, and serve it behind an Amazon CloudFront distribution. CloudFront terminates TLS using an AWS Certificate Manager (ACM) certificate mapped to the desired domains.【F:package.json†L7-L15】
2. **Backend API** – Package the .NET API into a container image, push to Amazon ECR, and run it on ECS Fargate with an Application Load Balancer (ALB). Attach an ACM certificate to the ALB listener for TLS termination before forwarding HTTP traffic to the containers. Configure RDS for the SQL Server database and, if needed, Amazon MQ/MemoryDB for background tasks.【F:OxygenBackend/Dockerfile†L1-L26】【F:OxygenBackend/QuizAPI/QuizAPI.csproj†L14-L24】
3. **FastAPI Microservice** – Containerize with a lightweight Python base image and deploy to ECS alongside the backend once the LLM integration is complete. Until then, keep it disabled in production environments.【F:microservice/main.py†L1-L118】
4. **Secrets & Configuration** – Store sensitive configuration (JWT keys, database credentials, API keys) in AWS Secrets Manager. Non-secret configuration (API base URLs, feature flags) should be stored in Systems Manager Parameter Store and injected via ECS task definitions or environment files.

Infrastructure as Code (IaC) scripts (Terraform or AWS CDK) will live under `infrastructure/` when available. Update this section with direct links once those scripts are committed.

### AWS TLS Management

- **Certificates** – Request and renew public certificates in AWS Certificate Manager (ACM) for each environment (e.g., `app.example.com`, `admin.example.com`). Attach the ACM certificate to the CloudFront distribution that serves the React static site and to the ALB that fronts the backend API.
- **Edge termination** – CloudFront handles HTTPS for end users and forwards plain HTTP requests to the S3 origin that contains the built `dist/` assets. The origin should block public access, relying on the CloudFront Origin Access Control.
- **Service-to-service traffic** – The backend ECS service receives HTTP (port 80) traffic from the ALB target group, matching the container port exposed by the image (`EXPOSE 80` in the Dockerfile).【F:Dockerfile†L1-L24】
- **Internal trust boundaries** – Because TLS terminates at CloudFront and the ALB, containers do not need mkcert-provided certificates. Keep mkcert tooling exclusively for local development via `npm run dev`.
