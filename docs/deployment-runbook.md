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

## 5. First thing to do next session — apply the Data Protection fix

The code + Dockerfile fixes are pushed; the server compose needs one edit, then a rebuild.

1. Edit the compose file on the server:
   ```bash
   nano ~/OxygenQuiz/docker-compose.prod.yml
   ```
   - Add to the `backend:` service's `volumes:` list:  `- dpkeys:/app/keys`
   - Add to the top-level `volumes:` block:  `dpkeys:`
   (So the top-level block reads: `postgres-data:`, `uploads:`, `dpkeys:`.)
2. Pull + rebuild:
   ```bash
   cd ~/OxygenQuiz
   git pull
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   docker compose -f docker-compose.prod.yml logs --tail 40 backend
   ```
3. Confirm the `/home/app/.aspnet/DataProtection-Keys` warning is gone and it's listening.

Then continue with **DNS on Cloudflare** (step 2 of the "Still to do" list in `deployment-progress.md`).

---

## Key files & secrets

| What | Where |
|---|---|
| Compose file | `~/OxygenQuiz/docker-compose.prod.yml` (on server only) |
| Secrets | `~/OxygenQuiz/.env.prod` (on server, chmod 600) + your password manager |
| SSH private key | on this desktop, `C:\Users\Pc\.ssh\id_ed25519` (never leaves the machine) |
| App logs | `docker compose ... logs backend` |
| Admin login | username `admin`, password = `ADMIN_PASSWORD` from `.env.prod` (change after first login) |
