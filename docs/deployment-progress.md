# Deployment Progress Log

> Running record of the OxygenQuiz production deployment. Companion to
> [`deployment.md`](./deployment.md) (the strategy), [`vps-launch-checklist.md`](./vps-launch-checklist.md)
> (the full step-by-step), and [`deployment-runbook.md`](./deployment-runbook.md) (copy-paste commands
> to reconnect and check state).
> Last updated: 2026-07-01 — **end of session: the backend is live on the VPS.**
>
> **▶ Resuming? Open [`deployment-runbook.md`](./deployment-runbook.md) first** for the exact commands
> to reconnect, then use the "Still to do" list below for what's next (DNS is the next step).

## Architecture we're deploying

- **Frontend:** Cloudflare Pages (static Vite build) — *not started yet*.
- **Backend + SignalR:** the Hetzner VPS, as Docker containers — **running**.
- **Database:** PostgreSQL, on the VPS via Docker — **running**.
- **MongoDB:** removed — not needed.
- **Edge:** Cloudflare proxy in front of everything — *not started yet*.

## Server facts

- Host: `ubuntu-4gb-hel1-1` (Hetzner CX23, 2 vCPU / 4 GB / 40 GB), Helsinki.
- Public IP: `89.167.23.147`
- Domain: `oxygenquiz.com` (registered; DNS not yet configured / not yet on Cloudflare).
- Working user on the server: `deploy` (sudo, key-only login; root login disabled).
- Repo on server: `/home/deploy/OxygenQuiz` (public GitHub repo).
- Compose file on server: `~/OxygenQuiz/docker-compose.prod.yml` (created directly on the server).
- Secrets file on server: `~/OxygenQuiz/.env.prod` (chmod 600, NOT in Git) — holds
  `POSTGRES_PASSWORD`, `JWT_KEY`, `ADMIN_PASSWORD`. **Also saved in your password manager.**

---

## Done so far

### 1. Code: dropped MongoDB (committed + pushed)
Mongo was only used by `LobbyChatArchiver`, a write-only audit sink nothing reads back; lobby chat is
ephemeral (SignalR in-memory), notifications are in Postgres, and `Chat-System/` + `MongoDB/Models/Chat.cs`
are dead code. Changes: commented out the `IMongoClient` registration in `Program.cs`, swapped the
archiver to `NoOpLobbyChatArchiver`, added that no-op class in `ILobbyChatArchiver.cs`.

### 2. Server baseline hardening
OS updated + rebooted onto new kernel; created sudo user `deploy` with our SSH key; `ufw` firewall
allowing SSH + 80 + 443; SSH locked to key-only (`PermitRootLogin no`, `PasswordAuthentication no`,
verified with `sudo sshd -T`).

### 3. SSH key setup (desktop)
Original key was on a laptop; generated a fresh `ed25519` key on this desktop and added its public
half to the server. `ssh deploy@89.167.23.147` works key-only from the desktop.

### 4. Docker installed
Engine + Compose plugin via get.docker.com; `deploy` added to the `docker` group; verified with
`hello-world`.

### 5. Repo cloned on the server
`git clone` of the public repo into `/home/deploy/OxygenQuiz`.

### 6. Backend deployment config
- `.env.prod` with the three secrets (chmod 600).
- `docker-compose.prod.yml` (no Mongo): `backend` (built from `OxygenBackend/QuizAPI/Dockerfile`,
  listens on 8080, published to `127.0.0.1:5000`) + `postgres`, with named volumes for uploads and
  Postgres data. Production config (domain, CORS, JWT issuer/audience) via env vars.

### 7. Backend is LIVE — plus two fixes made along the way
Brought it up with `docker compose ... up -d --build`. Hit and fixed two issues:

- **Hangfire crash (fixed, committed + pushed).** `Program.cs` scheduled a recurring job with the
  *static* `RecurringJob.AddOrUpdate`, which needs Hangfire's global `JobStorage.Current`. That global
  was only being initialized as a side effect of mapping the Hangfire dashboard — which is skipped in
  Production — so the app crashed on boot. Fixed by scheduling through the DI-registered
  `IRecurringJobManager` inside an `app.Services.CreateScope()` block. Works in every environment.
- **Data Protection keys (fixed — NEEDS a rebuild + a compose edit, see "Current step").** ASP.NET was
  storing Data Protection keys inside the container, so they'd reset on every rebuild (invalidating
  antiforgery tokens / protected cookies). Fixed by persisting keys to `/app/keys` on a Docker volume:
  - `Program.cs`: `AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo("/app/keys")).SetApplicationName("OxygenQuiz")`.
  - `Dockerfile`: create `/app/keys` owned by the app user.
  - `docker-compose.prod.yml`: **still needs** a `dpkeys` volume mounted at `/app/keys` (see below).

Confirmed healthy in the logs: migrations applied, admin seeded, Hangfire server started,
`Now listening on: http://[::]:8080`, `Hosting environment: Production`.

---

## Current step — apply the Data Protection fix (do this first tomorrow)

The Hangfire fix is already running. The Data Protection fix is written in code and pushed to GitHub,
but not yet deployed to the server. Steps:

1. **Pull the new change first:**
   ```bash
   cd ~/OxygenQuiz
   git pull
   ```
2. **Edit `~/OxygenQuiz/docker-compose.prod.yml`** to add the keys volume:
   - Under the `backend:` service `volumes:` list, add:  `- dpkeys:/app/keys`
   - Under the top-level `volumes:` block (next to `postgres-data:` and `uploads:`), add:  `dpkeys:`
3. **Rebuild:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   docker compose -f docker-compose.prod.yml logs --tail 40 backend
   ```
4. Confirm the Data Protection warning about `/home/app/.aspnet/DataProtection-Keys` is **gone** and it
   still reaches `Now listening on: http://[::]:8080`.

> Note: because the key location changed, any antiforgery tokens/cookies issued before this rebuild
> become invalid — harmless now (no real users yet), which is exactly why we're doing it before launch.

---

## Still to do (in order)

1. **Apply the Data Protection fix** (the "Current step" above).
2. **DNS on Cloudflare** — move `oxygenquiz.com` nameservers to Cloudflare; add `api` A record →
   `89.167.23.147` (proxied), root + `www` → Cloudflare Pages.
3. **Origin TLS + reverse proxy** — Cloudflare Origin cert on the VPS; install Nginx in front of the
   backend with WebSocket upgrade headers (SignalR); Cloudflare SSL mode → Full (strict).
4. **Frontend to Cloudflare Pages** — `npm run build`, deploy `dist/`, set
   `VITE_API_URL=https://api.oxygenquiz.com/api`, attach root + `www` domains.
5. **Turn on the strict config gate** — uncomment `Security__EnforceProductionConfig=true` in the
   compose once the real domain is serving, and rebuild.
6. **Lock the origin to Cloudflare** — restrict `ufw` 80/443 to Cloudflare IP ranges; enable Bot Fight
   Mode + rate-limit rules on auth/guest endpoints.
7. **Smoke test over HTTPS** — signup/login, guest play, a full 2-browser multiplayer match (WebSockets
   end to end), upload persists across a rebuild, admin reachable, Hangfire dashboard NOT reachable.
8. **Change the seeded admin password** after first login.
9. **Post-launch:** Postgres backup cron (`pg_dump` → object storage), basic uptime monitoring.
