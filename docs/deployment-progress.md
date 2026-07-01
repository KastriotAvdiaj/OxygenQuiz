# Deployment Progress Log

> Running record of the OxygenQuiz production deployment. Companion to
> [`deployment.md`](./deployment.md) (the strategy) and [`vps-launch-checklist.md`](./vps-launch-checklist.md)
> (the full step-by-step). This file tracks **what's actually been done so far** and **what's next**.
> Last updated: 2026-07-01.

## Architecture we're deploying

- **Frontend:** Cloudflare Pages (static Vite build) — *not started yet*.
- **Backend + SignalR:** the Hetzner VPS, as Docker containers — *in progress*.
- **Database:** PostgreSQL, running on the VPS via Docker.
- **MongoDB:** removed — not needed (see below).
- **Edge:** Cloudflare proxy in front of everything — *not started yet*.

## Server facts

- Host: `ubuntu-4gb-hel1-1` (Hetzner CX23, 2 vCPU / 4 GB / 40 GB), Helsinki.
- Public IP: `89.167.23.147`
- Domain: `oxygenquiz.com` (registered, DNS not yet configured / not yet on Cloudflare).
- Working user on the server: `deploy` (sudo-enabled, key-only login).
- Repo cloned on server at: `/home/deploy/OxygenQuiz` (public GitHub repo).

---

## Done so far

### 1. Code change — dropped MongoDB
Verified Mongo was only used by `LobbyChatArchiver`, a write-only audit sink that nothing reads back;
lobby chat is ephemeral (SignalR in-memory). Notifications live in Postgres, not Mongo. The whole
`Chat-System/` folder and `MongoDB/Models/Chat.cs` are unused/dead code.

Changes made (committed + pushed to GitHub):
- `Program.cs`: commented out the `IMongoClient` registration.
- `Program.cs`: swapped the archiver binding to `NoOpLobbyChatArchiver`.
- `ILobbyChatArchiver.cs`: added `NoOpLobbyChatArchiver` (does nothing, satisfies the interface).

Result: the app runs with **no MongoDB** — no container, no Atlas, no null/DI errors, no warning spam.

### 2. Server baseline hardening
- Updated the OS (`apt update && apt upgrade`); rebooted onto the new kernel.
- Created a non-root sudo user `deploy` and gave it our SSH key.
- Configured `ufw` firewall: allow SSH + 80 + 443, enabled.
- Locked down SSH in `/etc/ssh/sshd_config`: `PermitRootLogin no` and `PasswordAuthentication no`
  (verified live with `sudo sshd -T`). Access is now **key-only**, no root login.

### 3. SSH key setup (desktop)
- The original key was generated on a laptop; this desktop had none.
- Generated a fresh `ed25519` key on the desktop and added its public half to the server's
  `authorized_keys`. `ssh deploy@89.167.23.147` now works key-only from the desktop.

### 4. Docker installed
- Installed Docker Engine + Compose plugin via the official get.docker.com script.
- Added `deploy` to the `docker` group (runs Docker without sudo).
- Verified: `docker --version` (29.6.1), `docker compose version` (v5.2.0), `hello-world` ran cleanly.

### 5. Repo on the server
- `git clone` of the public repo into `/home/deploy/OxygenQuiz` succeeded.

### 6. Backend deployment config (in progress)
- Created `.env.prod` on the server with three secrets: `POSTGRES_PASSWORD`, `JWT_KEY`,
  `ADMIN_PASSWORD` (chmod 600, not in Git). These are supplied to the app as environment variables
  (production equivalent of local .NET user-secrets).
- Created `docker-compose.prod.yml` (no Mongo): a `backend` service (built from
  `OxygenBackend/QuizAPI/Dockerfile`, listening on 8080, published to `127.0.0.1:5000`) and a
  `postgres` service, with a named volume for uploads and one for Postgres data. Production config
  (domain, CORS, JWT issuer/audience) set via env vars.

---

## Current step

Bringing the backend up for the first time:

```bash
cd ~/OxygenQuiz
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml logs -f backend
```

Success looks like: EF migrations apply → seeder creates admin + reference data →
`Now listening on: http://[::]:8080`. Local sanity check:
`curl -i -H "Host: api.oxygenquiz.com" http://localhost:5000/`.

The strict startup gate (`Security__EnforceProductionConfig=true`) is intentionally left **off** for
this first boot; it gets turned on after the domain + TLS are wired and tested.

---

## Still to do

1. **Verify the backend boots** — migrations, seeding, listening; local curl responds.
2. **DNS on Cloudflare** — move `oxygenquiz.com` nameservers to Cloudflare; add `api` A record →
   `89.167.23.147` (proxied), root + `www` → Cloudflare Pages.
3. **Origin TLS + reverse proxy** — Cloudflare Origin certificate on the VPS; install Nginx in front
   of the backend with WebSocket upgrade headers (for SignalR); set Cloudflare SSL mode to Full (strict).
4. **Frontend to Cloudflare Pages** — `npm run build`, deploy `dist/`, set
   `VITE_API_URL=https://api.oxygenquiz.com/api`, attach root + `www` domains.
5. **Turn on the strict config gate** (`Security__EnforceProductionConfig=true`) once the real domain
   is serving.
6. **Lock the origin to Cloudflare** — restrict `ufw` 80/443 to Cloudflare IP ranges (so the
   `CF-Connecting-IP` header can't be spoofed); enable Bot Fight Mode + rate-limit rules on
   auth/guest endpoints.
7. **Smoke test over HTTPS** — signup/login, guest play, a full 2-browser multiplayer match
   (verifies WebSockets end to end), upload persists across a rebuild, admin reachable, Hangfire not.
8. **Change the seeded admin password** after first login.
9. **Post-launch:** Postgres backup cron (`pg_dump` → object storage), basic uptime monitoring.
