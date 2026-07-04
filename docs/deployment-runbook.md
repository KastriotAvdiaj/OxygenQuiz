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

## 5. DONE — Data Protection fix + DNS on Cloudflare (2026-07-03)

- ✅ Data Protection `dpkeys` volume added to `docker-compose.prod.yml` and deployed; warning gone.
- ✅ DNS moved to Cloudflare, nameservers switched at Spaceship, DNSSEC off, domain **Active**.
- ✅ Local commit pushed: forwarded headers in `Program.cs` + `VITE_API_URL=https://api.oxygenquiz.com/api`
  (⚠️ not yet pulled/rebuilt on the VPS — that's step 1 below).

See `deployment-progress.md` "Done this session" for detail.

---

## 6. FIRST THING NEXT SESSION — bring `api.oxygenquiz.com` online (Nginx + Origin cert)

Prereq in Cloudflare (do/verify in the dashboard before touching the server):
- DNS: `A api → 89.167.23.147` **proxied**; delete junk `A ftp` and `A webdisk` (→ 203.161.45.17).
- SSL/TLS → Origin Server → **Create Certificate** (`oxygenquiz.com` + `*.oxygenquiz.com`, RSA, 15y).
  Copy the **cert** and **private key** — the key shows only once; regenerate if it wasn't saved.
- ⚠️ Leave SSL/TLS mode as-is for now; switch to **Full (strict)** only in step 4 (after Nginx is up).

**1. Deploy the pushed code (applies forwarded headers):**
```bash
ssh deploy@89.167.23.147
cd ~/OxygenQuiz
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml logs --tail 20 backend   # still "Now listening on: http://[::]:8080"
```

**2. Install Nginx + the Origin cert:**
```bash
sudo apt update && sudo apt -y install nginx
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/origin.pem   # paste the ORIGIN CERTIFICATE block (incl. BEGIN/END lines)
sudo nano /etc/ssl/cloudflare/origin.key   # paste the PRIVATE KEY block
sudo chmod 600 /etc/ssl/cloudflare/origin.key
```

**3. Add the reverse-proxy site, test, reload:**
```bash
sudo nano /etc/nginx/sites-available/api.oxygenquiz.com
```
Paste:
```nginx
server {
    listen 443 ssl;
    server_name api.oxygenquiz.com;

    ssl_certificate     /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # WebSocket upgrade — required for SignalR (/quizHub, /notificationHub)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
server {
    listen 80;
    server_name api.oxygenquiz.com;
    return 301 https://$host$request_uri;
}
```
```bash
sudo ln -s /etc/nginx/sites-available/api.oxygenquiz.com /etc/nginx/sites-enabled/
sudo nginx -t                     # must say "syntax is ok" + "test is successful"
sudo systemctl reload nginx
```

**4. Only after Nginx reloads cleanly:** Cloudflare → SSL/TLS → set mode to **Full (strict)**, then test:
```bash
curl -I https://api.oxygenquiz.com/     # from anywhere; expect an HTTP status line back
```

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
| Admin login | username `admin`, password = `ADMIN_PASSWORD` from `.env.prod` (change after first login) |
