# Deployment Runbook — quick commands

> Copy-paste reference to reconnect to the server and drive the deployment. For *where we are* and
> *what's next*, see [`deployment-progress.md`](./deployment-progress.md).
> Server: `deploy@89.167.23.147` · domain `oxygenquiz.com`.

---

## 1. Connect to the server

From your **desktop** (PowerShell). Key-only login, no password:

```powershell
ssh deploy@89.167.23.147
```

- Root login and password login are disabled — only your desktop's SSH key works.
- If you ever need the browser-based console instead, use the `>_` icon on the Hetzner server page.
- Landing prompt looks like: `deploy@ubuntu-4gb-hel1-1:~$`

---

## 2. Check the current state of things

All run **on the server**:

```bash
cd ~/OxygenQuiz

# Are the containers up? (backend + postgres should both be running; postgres "healthy")
docker compose -f docker-compose.prod.yml ps

# Recent backend logs (look for "Now listening on: http://[::]:8080")
docker compose -f docker-compose.prod.yml logs --tail 40 backend

# Is the app answering HTTP locally? (Host header is faked because AllowedHosts is pinned)
curl -i -H "Host: api.oxygenquiz.com" http://localhost:5000/
```

Any HTTP status line back from `curl` = the backend is alive.

---

## 3. Everyday operations

```bash
cd ~/OxygenQuiz

# Start / recreate everything (always include --env-file so secrets load)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Rebuild after pulling new code
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Follow logs live (Ctrl+C to stop; containers keep running)
docker compose -f docker-compose.prod.yml logs -f backend

# Stop everything (keeps data volumes)
docker compose -f docker-compose.prod.yml down

# Restart just the backend
docker compose -f docker-compose.prod.yml --env-file .env.prod restart backend
```

Notes:
- The `WARN ... variable is not set` messages appear on commands run **without** `--env-file .env.prod`
  (like `logs` / `ps`). They're cosmetic — the running containers already have the real values.
- Data lives in Docker volumes (`oxygenquiz_postgres-data`, `oxygenquiz_uploads`, and the new
  `oxygenquiz_dpkeys`). `down` does NOT delete them; `down -v` WOULD (don't use `-v` unless you mean it).

---

## 4. Deploying a code change (desktop → GitHub → server)

On the **desktop**:

```powershell
cd C:\Users\Pc\source\repos\OxygenQuiz
dotnet build OxygenBackend\QuizAPI          # sanity check it compiles
git add -A
git commit -m "your message"
git push
```

On the **server**:

```bash
cd ~/OxygenQuiz
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## 5. DONE — Data Protection fix + DNS + CI fix + Origin cert (2026-07-03 → 07-04)

- ✅ Data Protection `dpkeys` volume added to `docker-compose.prod.yml` and deployed; warning gone.
- ✅ DNS moved to Cloudflare, nameservers switched at Spaceship, DNSSEC off, domain **Active**.
- ✅ Local commit pushed: forwarded headers in `Program.cs` + `VITE_API_URL=https://api.oxygenquiz.com/api`
  (⚠️ not yet pulled/rebuilt on the VPS — that's step 1 in §6 below).
- ✅ **CI build fix (2026-07-04):** removed the last live MongoDB usage from `Program.cs` (commented out
  the `AddSingleton<IMongoClient>` block, swapped the archiver to `NoOpLobbyChatArchiver`). The `Tests`
  workflow was failing on `'IMongoClient'/'MongoClient' could not be found`; now green. Pushed to `main`.
- ✅ **Cloudflare Origin certificate created + saved (2026-07-04):** `oxygenquiz.com` + `*.oxygenquiz.com`,
  RSA, 15y, PEM. Cert + private key saved (key is shown only once) — paste them onto the VPS in §6 step 2.

See `deployment-progress.md` "Done this session" (§11, §12) for detail.

---

## 6. ✅ DONE (2026-07-04) — bring `api.oxygenquiz.com` online (Nginx + Origin cert)

> **Completed.** `api.oxygenquiz.com` is live: backend redeployed, Nginx serving 443 with the Origin
> cert, Cloudflare = Full (strict). Verified: `/api/AuditLogs` → real app `401` via `Server: cloudflare`.
> Kept below as reference (annotated line-by-line). **Gotcha for next time:** paste PEM blocks *with*
> their `-----BEGIN/END-----` delimiter lines, or OpenSSL/nginx can't parse them. Next: frontend (§7 / the
> "Still to do" list in `deployment-progress.md`).

**What this section does, in one line:** Cloudflare is already in front of the domain, but the backend
only listens on `127.0.0.1:5000` (localhost). Nginx will sit on the VPS listening on port 443 with the
Cloudflare Origin cert, decrypt HTTPS, and forward requests to the backend — so `api.oxygenquiz.com`
finally resolves end-to-end.

Prereq in Cloudflare (do/verify in the dashboard before touching the server):
- [x] ~~SSL/TLS → Origin Server → **Create Certificate** (`oxygenquiz.com` + `*.oxygenquiz.com`, RSA,
  15y). Copy the cert + private key — the key shows only once.~~ **DONE** — cert + key saved.
- [ ] DNS: confirm `A api → 89.167.23.147` **proxied** (orange cloud); delete junk `A ftp` and
  `A webdisk` (→ 203.161.45.17).
- ⚠️ Leave SSL/TLS mode as-is for now; switch to **Full (strict)** only in step 4 (after Nginx is up).

**1. Deploy the pushed code (applies forwarded headers + the CI/Mongo fix):**
```bash
ssh deploy@89.167.23.147                                              # connect to the VPS (key-only login)
cd ~/OxygenQuiz                                                       # into the repo checked out on the server
git pull                                                             # fetch + merge the latest main (forwarded headers, Mongo fix)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build   # rebuild the image from new code and restart in the background
docker compose -f docker-compose.prod.yml logs --tail 20 backend     # confirm boot: expect "Now listening on: http://[::]:8080"
```
Line by line:
- `ssh deploy@89.167.23.147` — open a shell on the VPS as the `deploy` user (root & password login are disabled).
- `cd ~/OxygenQuiz` — the server's clone of the public repo; the compose + `.env.prod` live here.
- `git pull` — pulls the commits pushed from the desktop (forwarded-headers block, MongoDB DI removal).
- `docker compose ... up -d --build` — `--build` recompiles the backend image from the new source;
  `-d` runs it detached (background); `--env-file .env.prod` injects the secrets (Postgres pw, JWT key, admin pw).
- `logs --tail 20 backend` — prints the last 20 log lines so you can verify migrations ran and it's listening.

**2. Install Nginx + save the Origin cert onto the server:**
```bash
sudo apt update && sudo apt -y install nginx                         # refresh package lists, then install the Nginx web server
sudo mkdir -p /etc/ssl/cloudflare                                    # a folder to hold the Cloudflare Origin cert + key
sudo nano /etc/ssl/cloudflare/origin.pem   # paste the ORIGIN CERTIFICATE block (incl. BEGIN/END lines)
sudo nano /etc/ssl/cloudflare/origin.key   # paste the PRIVATE KEY block (the one shown only once in Cloudflare)
sudo chmod 600 /etc/ssl/cloudflare/origin.key                        # lock the key so only root can read it (private keys must never be world-readable)
```
Line by line:
- `apt update && apt -y install nginx` — `update` refreshes the package index; `install nginx -y`
  installs Nginx and auto-answers "yes" to prompts. Nginx is the reverse proxy that terminates TLS.
- `mkdir -p /etc/ssl/cloudflare` — `-p` makes the directory (and parents) without erroring if it exists.
- `nano ...origin.pem` / `...origin.key` — paste the two blocks you saved from Cloudflare into these files.
- `chmod 600 origin.key` — permissions `600` = read/write for the owner (root) only; nginx reads it as root at startup.

**3. Add the reverse-proxy site, test, reload:**
```bash
sudo nano /etc/nginx/sites-available/api.oxygenquiz.com              # create the site config (see block below)
```
Paste this server block (annotated — the `#` comments are safe to keep, Nginx ignores them):
```nginx
server {
    listen 443 ssl;                              # listen for HTTPS (TLS) on port 443
    server_name api.oxygenquiz.com;              # only handle requests for this hostname

    ssl_certificate     /etc/ssl/cloudflare/origin.pem;   # the Cloudflare Origin cert (public half)
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;   # its private key (the 600-locked file)

    location / {                                 # for every path under this host...
        proxy_pass http://127.0.0.1:5000;        # ...forward to the backend container (localhost:5000)
        proxy_http_version 1.1;                  # HTTP/1.1 is required for the WebSocket Upgrade handshake

        # WebSocket upgrade — required for SignalR (/quizHub, /notificationHub).
        # Without these two lines multiplayer/live features silently fail to connect.
        proxy_set_header Upgrade $http_upgrade;          # pass the client's "Upgrade: websocket" header through
        proxy_set_header Connection "upgrade";           # tell the backend to switch protocols

        proxy_set_header Host $host;                      # preserve the original Host so the app knows its domain
        proxy_set_header X-Real-IP $remote_addr;          # real client IP (else the app sees only nginx's IP)
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # chain of proxies the request passed through
        proxy_set_header X-Forwarded-Proto $scheme;       # tells the app the request was HTTPS (drives the UseForwardedHeaders block → https:// URLs)

        proxy_read_timeout 3600s;                # keep idle WebSocket connections open up to 1h (long matches)
        proxy_send_timeout 3600s;                # same, for the send direction
    }
}
server {
    listen 80;                                   # plain HTTP on port 80...
    server_name api.oxygenquiz.com;
    return 301 https://$host$request_uri;        # ...permanently redirect everything to HTTPS
}
```
```bash
sudo ln -s /etc/nginx/sites-available/api.oxygenquiz.com /etc/nginx/sites-enabled/   # enable the site (symlink into sites-enabled/)
sudo nginx -t                     # validate config — must say "syntax is ok" + "test is successful"
sudo systemctl reload nginx       # apply the new config with zero downtime (graceful reload, no dropped connections)
```
Line by line:
- `ln -s .../sites-available/... .../sites-enabled/` — Nginx only loads sites symlinked into
  `sites-enabled/`; `-s` makes a symbolic link so the real file stays in `sites-available/`.
- `nginx -t` — dry-run parse of the whole config; **always run this before reloading** so a typo can't take the site down.
- `systemctl reload nginx` — reloads config in place (unlike `restart`, it doesn't drop live connections).

**4. Only after Nginx reloads cleanly:** Cloudflare → SSL/TLS → set mode to **Full (strict)**, then test:
```bash
curl -I https://api.oxygenquiz.com/     # -I = HEAD request only (headers, no body); expect an HTTP status line back
```
- **Full (strict)** = Cloudflare encrypts to your origin *and* verifies the Origin cert. Don't flip this
  before Nginx is serving 443 with the cert, or Cloudflare→origin fails with a 5xx.
- `curl -I` fetches just the response headers, so a `HTTP/2 200` (or any status line) confirms the full
  path Cloudflare → Nginx → backend works.

Then continue with the frontend rebuild + Worker custom domains (step 2 of "Still to do" in
`deployment-progress.md`).

---

## Key files & secrets

| What | Where |
|---|---|
| Compose file | `~/OxygenQuiz/docker-compose.prod.yml` (on server only) |
| Secrets | `~/OxygenQuiz/.env.prod` (on server, chmod 600) + your password manager |
| SSH private key | on this desktop, `C:\Users\Pc\.ssh\id_ed25519` (never leaves the machine) |
| App logs | `docker compose ... logs backend` |
| Admin login | **Log in by EMAIL** (not username). Email = `Seed:AdminEmail`, or `admin@example.com` if that env var isn't set (the `kaloti@…` value is dev-only). Password = `ADMIN_PASSWORD` from `.env.prod`. Change after first login. |

### Where's the admin password? (so you don't have to ask again)

Login is **by email + password**:

- **Password** — `ADMIN_PASSWORD` in `~/OxygenQuiz/.env.prod` on the server, and also in your
  password manager. Read it with:
  ```bash
  ssh deploy@89.167.23.147
  grep ADMIN_PASSWORD ~/OxygenQuiz/.env.prod
  ```
- **Email** — whatever `Seed__AdminEmail` was set to when the admin was first seeded. If it was
  never set as an env var, the account defaults to **`admin@example.com`** (because
  `appsettings.Development.json`, which holds the `kaloti@…` value, is NOT loaded in Production —
  see "How appsettings is loaded in production" in [`infrastructure.md`](./infrastructure.md) §11).
  Confirm the actual seeded email from the database (open a psql shell inside the postgres container,
  so `$POSTGRES_USER`/`$POSTGRES_DB` expand *inside* the container, not your host shell):
  ```bash
  cd ~/OxygenQuiz
  docker compose -f docker-compose.prod.yml exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  ```
  then at the `psql` prompt (column names are PascalCase, so they must be double-quoted):
  ```sql
  SELECT "Username", "Email" FROM "Users" WHERE "ImmutableName" = 'admin';
  \q
  ```

> ⚠️ The admin is seeded **once** — if it already exists, changing `ADMIN_PASSWORD` later does
> nothing. To reset a forgotten admin password you must update the `PasswordHash` directly (BCrypt)
> or delete the admin row and let it re-seed on the next boot.
