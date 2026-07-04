# Deployment Progress Log

> Running record of the OxygenQuiz production deployment. Companion to
> [`deployment.md`](./deployment.md) (the strategy), [`vps-launch-checklist.md`](./vps-launch-checklist.md)
> (the full step-by-step), and [`deployment-runbook.md`](./deployment-runbook.md) (copy-paste commands
> to reconnect and check state).
> Last updated: 2026-07-03 — **end of session: DNS is live on Cloudflare; the domain is Active.
> Backend Data Protection fix deployed. Next up: Nginx reverse proxy + Origin cert to bring
> `api.oxygenquiz.com` online.**
>
> **▶ Resuming? Open [`deployment-runbook.md`](./deployment-runbook.md) §6** for the exact copy-paste
> commands to finish the Nginx + Origin-cert step, then continue with the "Still to do" list below.

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

## Current step — bring `api.oxygenquiz.com` online (Nginx + Origin cert)

DNS is active but the backend is still **localhost-only** (`127.0.0.1:5000`); nothing external can
reach it until the reverse proxy + TLS are in place. Full copy-paste commands are in
[`deployment-runbook.md`](./deployment-runbook.md) §6. In order:

1. **In Cloudflare (verify / do if not already):**
   - DNS: `A api → 89.167.23.147`, **proxied**. Delete the junk `A ftp` and `A webdisk` (→ 203.161.45.17) records.
   - SSL/TLS → Origin Server → **Create Certificate** for `oxygenquiz.com` + `*.oxygenquiz.com`, RSA, 15y.
     **Save the cert + private key** — the key is shown only once; regenerate if it wasn't saved.
2. **On the VPS — deploy the pushed code:** `git pull` then rebuild the backend (applies forwarded headers).
3. **On the VPS — Nginx:** install nginx, save the Origin cert/key to `/etc/ssl/cloudflare/origin.pem`
   and `origin.key` (chmod 600 the key), add the `api.oxygenquiz.com` server block (WebSocket upgrade
   headers → `127.0.0.1:5000`), `sudo nginx -t`, `sudo systemctl reload nginx`.
4. **Only after Nginx reloads cleanly:** set Cloudflare **SSL/TLS mode → Full (strict)**, then test
   `https://api.oxygenquiz.com`.

> ⚠️ Order matters: do **not** set Full (strict) before Nginx is serving 443 with the Origin cert, or
> Cloudflare→origin will fail. Nginx first, verify, then flip the mode.

---

## Historical note — local prep detail (superseded by "Done this session §10")

- **Forwarded headers** — added the `UseForwardedHeaders` block after `var app = builder.Build();`
  in `Program.cs` (production-runbook §0). Needed so the app builds `https://` URLs behind Nginx +
  Cloudflare. Deploys with the next `git pull` + rebuild on the VPS.
- **`VITE_API_URL`** — changed in `.env.production` from the dead AWS IP (`http://3.70.217.174:8080/api`)
  to `https://api.oxygenquiz.com/api`. Takes effect on the next frontend build/deploy.
- ⚠️ **`VITE_LLM_URL` still `http://3.79.13.249:8000`** — a bare IP over HTTP; the HTTPS frontend will
  block it as mixed content. **DECISION PENDING:** give the LLM microservice its own TLS subdomain
  (e.g. `llm.oxygenquiz.com`) or proxy it via Nginx under `api.oxygenquiz.com`. Only matters if the
  LLM feature is used in production.

## Still to do (in order)

- [x] ~~Apply the Data Protection fix~~ — done this session (§8).
- [x] ~~DNS on Cloudflare (nameservers + activation)~~ — done this session (§9).

1. **Origin TLS + reverse proxy (NEXT)** — see "Current step" above and `deployment-runbook.md` §6.
   Cloudflare Origin cert on the VPS; `git pull` + rebuild the backend (applies forwarded headers);
   install Nginx with WebSocket upgrade headers → `127.0.0.1:5000`; then Cloudflare SSL mode → Full (strict).
   - Still to confirm/finish in Cloudflare DNS: `A api → 89.167.23.147` (proxied) added; junk `A ftp`
     and `A webdisk` (→ 203.161.45.17) deleted.
2. **Frontend on Cloudflare** — already deployed via `wrangler deploy` (Worker `oxygenquiz`, static
   assets, `wrangler.jsonc` in repo root). Remaining: rebuild with the new `VITE_API_URL` and attach
   root + `www` as **custom domains** on the Worker (Workers & Pages → oxygenquiz → Domains & Routes).
   This also replaces the parking-IP `A oxygenquiz.com` + `CNAME www` records.
3. **Email records** (`MX mx1/mx2.spacemail.com`, `SRV _autodiscover`, `TXT v=spf1...`): keep only if
   using `@oxygenquiz.com` email; otherwise safe to remove. — *DECISION PENDING.*
4. **Turn on the strict config gate** — uncomment `Security__EnforceProductionConfig=true` in the
   compose once the real domain is serving, and rebuild.
5. **Lock the origin to Cloudflare** — restrict `ufw` 80/443 to Cloudflare IP ranges; enable Bot Fight
   Mode + rate-limit rules on auth/guest endpoints.
6. **Smoke test over HTTPS** — signup/login, guest play, a full 2-browser multiplayer match (WebSockets
   end to end), upload persists across a rebuild, admin reachable, Hangfire dashboard NOT reachable.
7. **Change the seeded admin password** after first login.
8. **Post-launch:** Postgres backup cron (`pg_dump` → object storage), basic uptime monitoring.
