# Deploy Cheat Sheet

> One-page copy-paste reference. Details: [`deployment-runbook.md`](deployment-runbook.md).

## Backend (VPS, Docker)

```powershell
# 1. Desktop — push the change
dotnet build OxygenBackend\QuizAPI
git add -A && git commit -m "message" && git push
```

```bash
# 2. Connect
ssh deploy@89.167.23.147

# 3. Pull + rebuild + restart
cd ~/OxygenQuiz
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4. Verify
docker compose -f docker-compose.prod.yml logs --tail 20 backend   # expect "Now listening on: http://[::]:8080"
docker compose -f docker-compose.prod.yml ps
```

> **There is no manual database step — and that's deliberate, not an omission.** `Program.cs`
> runs `await context.Database.MigrateAsync()` at startup, before the app serves traffic, so
> step 3 applies every pending migration when the container boots. Never run `Update-Database`
> against production.
>
> What *isn't* automatic: **creating** the migration. `Add-Migration <Name>` on your desktop,
> then commit and push it — the server builds from the repo, so a migration that only exists on
> your machine never reaches production. `Update-Database` locally only touches your dev DB.
>
> If a migration fails, startup throws and the API refuses to serve (fail-fast, by design) —
> you'll see it in the step 4 logs as `Database migration/seeding failed`. Nothing backs the DB
> up first, so take a dump before deploying anything destructive (drops, renames, narrowing
> column types).

### Backend extras

```bash
# Restart backend only (no rebuild)
docker compose -f docker-compose.prod.yml --env-file .env.prod restart backend

# Live logs (Ctrl+C to stop)
docker compose -f docker-compose.prod.yml logs -f backend

# Stop / start everything (down keeps volumes; NEVER use -v casually)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Is the app answering locally?
curl -i -H "Host: api.oxygenquiz.com" http://localhost:5000/

# Nginx (after config changes)
sudo nginx -t && sudo systemctl reload nginx
```

## Frontend (Cloudflare Workers — desktop only, no VPS)

```powershell
npm run build          # tsc + bundle into dist/
npx wrangler deploy    # ships dist/ live to oxygenquiz.com
git add -A && git commit -m "message" && git push   # keep repo in sync with what's live
```

Then hard-refresh `oxygenquiz.com` (Ctrl+Shift+R) — stale look = browser cache, not a failed deploy.

⚠️ Backend rebuild does NOT deploy frontend changes, and vice-versa. `wrangler deploy` ships whatever is already in `dist/` — always `npm run build` first.

## Quick reference

| What | Where |
|---|---|
| Server | `deploy@89.167.23.147` (key-only, root/password login disabled) |
| Repo on server | `~/OxygenQuiz` |
| Secrets | `~/OxygenQuiz/.env.prod` (chmod 600) |
| API | `https://api.oxygenquiz.com` (Cloudflare → Nginx :443 → backend :5000) |
| Frontend | Cloudflare Workers, `oxygenquiz.com` |
