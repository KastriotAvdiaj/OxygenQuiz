# Deployment Progress Log

> Running record of the OxygenQuiz production deployment. Companion to
> [`deployment.md`](deployment.md) (the strategy), [`vps-launch-checklist.md`](vps-launch-checklist.md)
> (the full step-by-step), and [`deployment-runbook.md`](deployment-runbook.md) (copy-paste commands
> to reconnect and check state).
> Last updated: 2026-07-04 — **Both tiers are LIVE and connected. `oxygenquiz.com` (Cloudflare Worker)
> serves the SPA, which talks to `api.oxygenquiz.com` (VPS behind Nginx + Cloudflare Full strict). Admin
> login works (`admin@example.com`). Frontend API-URL bug, custom domains, and the Worker deploy config
> are all fixed (§14). Next up: full smoke test + security cleanup before calling it launched.**
>
> **▶ Resuming? See "Current step — smoke test + production hardening" below.** Architecture reference:
> [`infrastructure.md`](infrastructure.md); config model: [`configuration.md`](configuration.md);
> outstanding fixes: [`known-issues.md`](known-issues.md).

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

## Done this session (2026-07-03)

### 8. Data Protection fix deployed ✅
Added the `dpkeys:/app/keys` volume to `docker-compose.prod.yml` (backend `volumes:` + top-level
`volumes:`) and rebuilt. Confirmed healthy: the `/home/app/.aspnet/DataProtection-Keys` warning is
**gone**, keys now persist on the `oxygenquiz_dpkeys` volume, and it still reaches
`Now listening on: http://[::]:8080`. (The remaining `No XML encryptor configured` warning is
expected/benign — keys are stored unencrypted at rest on a root-only volume; fine for single-server.)

### 9. DNS moved to Cloudflare — domain is ACTIVE ✅
- Created a Cloudflare account, added `oxygenquiz.com` (Free plan).
- Switched nameservers at **Spaceship** to `houston.ns.cloudflare.com` + `treasure.ns.cloudflare.com`
  (removed `launch1/launch2.spaceship.net`).
- Confirmed **DNSSEC is OFF** at Spaceship (0 DS records) — no conflict with the nameserver switch.
- Cloudflare confirmed activation; the zone is live (Free plan).

### 10. Local code prep — committed + pushed ✅
- **Forwarded headers** — added the `UseForwardedHeaders` block after `var app = builder.Build();` in
  `Program.cs` (production-runbook §0), so the app builds `https://` URLs behind Nginx + Cloudflare.
- **`VITE_API_URL`** — changed in `.env.production` from the dead AWS IP (`http://3.70.217.174:8080/api`)
  to `https://api.oxygenquiz.com/api`.
- Committed as "Deploy prep: forwarded headers + production API URL" and pushed.
  ⚠️ **Not yet deployed to the VPS** — needs `git pull` + rebuild (that's the first command tomorrow).

### Decisions locked this session
- **LLM feature: NOT used in production.** So `VITE_LLM_URL` (`http://3.79.13.249:8000`) can be ignored
  for launch — no TLS subdomain / Nginx route needed for it now. (Revisit only if the LLM feature is
  ever turned on.)

---

## Done this session (2026-07-04)

### 11. CI build fix — MongoDB fully removed from DI ✅
The `git push` at the end of the last session went red in GitHub Actions (`Tests` workflow → *Backend
(.NET) tests*): `The type or namespace name 'IMongoClient'/'MongoClient' could not be found` at
`Program.cs` L44 and L47. Root cause: last session we commented out the `using MongoDB.Driver;` import
but **left the DI registration that uses it still active** — so the app no longer compiled, which
failed `dotnet test` (the test build compiles the `QuizAPI` project it references). Two edits in
`OxygenBackend/QuizAPI/Program.cs` finished the job the notes claimed was already done:

- Commented out the whole `AddSingleton<IMongoClient>(...)` block (the last live use of the Mongo
  driver in this file), with a comment pointing to how to re-enable it.
- Swapped the archiver registration from `AddSingleton<ILobbyChatArchiver, LobbyChatArchiver>()` to
  `AddSingleton<ILobbyChatArchiver, NoOpLobbyChatArchiver>()` — the no-op needs no `IMongoClient`, so
  DI resolves cleanly at runtime too (not just at compile time).

`ILobbyChatArchiver.cs` still keeps its own `using MongoDB.Driver;` and the package is still
referenced, so the (now unused) `LobbyChatArchiver` class still compiles and can be swapped back in
later. Pushed to `main`; the `Tests` workflow is green. (The Node.js 20 deprecation *warning* on the
Actions runner is unrelated and harmless.)

### 12. Cloudflare Origin certificate created + saved ✅
SSL/TLS → Origin Server → **Create Certificate** for `oxygenquiz.com` + `*.oxygenquiz.com` (RSA, 15y,
PEM). Copied both the **Origin Certificate** and the **Private Key** (the key is shown only once) and
saved them before clicking OK. These get pasted onto the VPS as `/etc/ssl/cloudflare/origin.pem` and
`origin.key` in the Nginx step below.

### 13. `api.oxygenquiz.com` brought online (Nginx + Origin cert + Full strict) ✅
- Deployed the pushed code on the VPS (`git pull` + rebuild); backend healthy, still listening on 8080.
- Saved the Origin cert/key to `/etc/ssl/cloudflare/origin.pem` + `origin.key` (chmod 600 on the key).
  **Gotcha hit + fixed:** the first paste omitted the `-----BEGIN/END-----` PEM delimiter lines, so
  OpenSSL/nginx couldn't parse them (`No supported data to decode`). Re-pasted the *full* blocks
  including the delimiter lines; `openssl x509` and `openssl rsa -check` then validated cleanly
  (cert good to 2041-06-30).
- Added the `api.oxygenquiz.com` Nginx server block (443 + Origin cert, `proxy_pass` → `127.0.0.1:5000`,
  WebSocket upgrade headers for SignalR, port-80 → 443 redirect). `nginx -t` passed, reloaded.
- Cloudflare SSL/TLS → **Full (strict)** saved.
- **Verified end-to-end from the desktop:** `curl.exe -i https://api.oxygenquiz.com/api/AuditLogs` →
  `HTTP/1.1 401 Unauthorized`, `Www-Authenticate: Bearer`, `Server: cloudflare`. A real app 401 (not a
  Cloudflare 52x) proves Cloudflare → nginx → backend works with the cert validated.

### 14. Frontend live on `oxygenquiz.com` + admin login working ✅
The SPA is now served from Cloudflare and talks to the production API. Several fixes were needed along
the way (all detailed in [`known-issues.md`](known-issues.md)):

- **Frontend ignored `VITE_API_URL`.** The API client and both SignalR hubs had
  `https://localhost:7153` **hard-coded** — only the LLM client read an env var. So every production
  build called localhost regardless of `.env.production`. Fixed all three to read `VITE_API_URL`
  (deriving the hub origin by stripping `/api`): `src/lib/Api-client.ts`,
  `src/context/multiplayer-context.tsx`, `src/features/notifications/components/use-notification-hub.ts`.
- **Custom domains attached to the Worker.** Added `oxygenquiz.com` + `www` as custom domains (replacing
  the parking-IP records). The apex now shows as a `Worker` DNS record; junk `A ftp`/`A webdisk` records
  were already gone.
- **Deploys never activated (the big one).** `wrangler deploy` uploaded assets but **errored before
  promoting the new version** — `wrangler.jsonc` had no `routes` and there was no `workers.dev`
  subdomain, so the *old* localhost bundle kept serving. Fixed by adding `workers_dev: false` +
  `custom_domain` routes for both hostnames to `wrangler.jsonc`.
- **Admin login.** Login is **by email**; the prod admin seeded as **`admin@example.com`** (the `kaloti@…`
  seed email lives only in `appsettings.Development.json`, not loaded in prod). Logged in successfully
  with `admin@example.com` + `ADMIN_PASSWORD`. See [`configuration.md`](configuration.md) for the full
  why, and [`deployment-runbook.md`](deployment-runbook.md) → "Where's the admin password?".
- **Baked-in creds removed.** `LoginForm` no longer pre-fills a real admin email/password into the
  public bundle.
- **Seed data is Development-only (not a bug).** Production shows 0 questions/categories because
  `DbSeeder` gates `EnsureSampleDataAsync` behind `IsDevelopment()`. Prod only seeds the admin + guest
  accounts + roles/permissions. Note: that same method also seeds the baseline **lookups** (languages/
  difficulties/categories), so prod has none of those either — create them in the admin UI, or split the
  seeder so lookups seed in every environment (decision pending).

---

## Current step — smoke test + production hardening

Both tiers are live and connected (`oxygenquiz.com` → `api.oxygenquiz.com`, admin login works). What's
left before calling it launched:

1. **Full smoke test over HTTPS** — signup/login, guest play, a 2-browser multiplayer match (WebSockets
   end to end), upload persists across a rebuild, admin reachable, Hangfire dashboard NOT reachable.
2. **Security cleanup** (tracked in [`known-issues.md`](known-issues.md)) — remove committed `certs/`
   (+ rotate the mkcert CA), change the seeded admin password, fix stale prod CORS origins in
   `appsettings.Production.json`, add `.gitattributes` for line endings.
3. **Lock down** — restrict `ufw` 80/443 to Cloudflare IP ranges; Bot Fight Mode + rate-limit rules;
   turn on the strict config gate (`Security__EnforceProductionConfig=true`).
4. **Post-launch** — Postgres backup cron + uptime monitoring.

> Reminder (decided §10): the LLM feature is off in production, so `VITE_LLM_URL` (bare-IP HTTP) is
> ignored for launch — no TLS subdomain needed unless/until that feature is turned on.

---

## Historical note — local prep detail (superseded by "Done this session §10")

- **Forwarded headers** — added the `UseForwardedHeaders` block after `var app = builder.Build();`
  in `Program.cs` (production-runbook §0). Needed so the app builds `https://` URLs behind Nginx +
  Cloudflare. Deploys with the next `git pull` + rebuild on the VPS.
- **`VITE_API_URL`** — changed in `.env.production` from the dead AWS IP (`http://3.70.217.174:8080/api`)
  to `https://api.oxygenquiz.com/api`. Takes effect on the next frontend build/deploy.
- ✅ **`VITE_LLM_URL` — RESOLVED (2026-07-15):** the bare-IP HTTP value (`http://3.79.13.249:8000`) was
  removed and the variable is now commented out in both `.env.development` and `.env.production`, since
  the LLM feature is not used in production. If it's ever enabled, give the microservice its own TLS
  subdomain (e.g. `llm.oxygenquiz.com`) or proxy it via Nginx under `api.oxygenquiz.com`, and set
  `VITE_LLM_URL` to that HTTPS URL — never a bare IP over HTTP.

## Still to do (in order)

- [x] ~~Apply the Data Protection fix~~ — done this session (§8).
- [x] ~~DNS on Cloudflare (nameservers + activation)~~ — done this session (§9).
- [x] ~~CI build fix (MongoDB removed from DI)~~ — done (§11).
- [x] ~~Origin TLS + reverse proxy — `api.oxygenquiz.com` live, Full (strict), verified~~ — done (§13).
- [x] ~~Frontend on Cloudflare — SPA live on `oxygenquiz.com`, custom domains attached, API-URL +
  wrangler deploy fixed, admin login works~~ — done (§14).

1. **Security cleanup (from [`known-issues.md`](known-issues.md)):** remove committed `certs/`
   (+ rotate mkcert CA), change the seeded admin password, fix stale prod CORS origins, add
   `.gitattributes` for line endings. Login-form baked-in creds already fixed (§14).
2. **Email records** (`MX mx1/mx2.spacemail.com`, `SRV _autodiscover`, `TXT v=spf1...`): keep only if
   using `@oxygenquiz.com` email; otherwise safe to remove. — *DECISION PENDING.*
4. **Turn on the strict config gate** — uncomment `Security__EnforceProductionConfig=true` in the
   compose once the real domain is serving, and rebuild.
5. **Lock the origin to Cloudflare** — restrict `ufw` 80/443 to Cloudflare IP ranges; enable Bot Fight
   Mode + rate-limit rules on auth/guest endpoints.
6. **Smoke test over HTTPS** — signup/login, guest play, a full 2-browser multiplayer match (WebSockets
   end to end), upload persists across a rebuild, admin reachable, Hangfire dashboard NOT reachable.
7. **Change the seeded admin password** after first login.
8. **Post-launch:** Postgres backup cron (`pg_dump` → object storage), basic uptime monitoring.
