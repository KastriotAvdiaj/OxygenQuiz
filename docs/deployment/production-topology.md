# Production topology — what actually runs

**Read this before any other deployment doc.** The repo contains two production designs and only
one of them has ever been deployed. Every contradiction you will find between the deployment
documents comes from that, so this file states which is which and is the authority when they
disagree.

Verified against the live server on 2026-08-29 (`docker ps`, `systemctl status nginx`,
`git status`, and the running container's port map).

---

## The live stack (design A)

```
                    Cloudflare
                        │
      ┌─────────────────┴──────────────────┐
      │                                    │
  oxygenquiz.com                    api.oxygenquiz.com
  www.oxygenquiz.com                        │
      │                                     │
  Cloudflare Workers                   Hetzner VPS
  (worker name: "oxygenquiz")               │
  Git build on push to main:           nginx (host package, systemd)
  npm run build + wrangler deploy      TLS termination + reverse proxy
                                            │
                                       127.0.0.1:5000
                                            │
                                    ┌───────┴────────┐
                                    │ Docker         │
                                    │  backend  ─────┼──> postgres:15
                                    │  (:8080)       │
                                    └────────────────┘
```

Facts that pin this down, so a future reader can re-verify rather than trust the diagram:

| | |
|---|---|
| Compose file in use | **`~/OxygenQuiz/docker-compose.prod.yml`** — the one at the repo ROOT |
| Containers | `oxygenquiz-backend-1`, `oxygenquiz-postgres-1`. **No Caddy container.** |
| Backend port | `127.0.0.1:5000 -> 8080` — localhost only, never exposed publicly |
| TLS / reverse proxy | **nginx**, installed on the host as a system package (`systemctl status nginx`), *not* in Docker. Caddy is not installed at all. |
| Frontend host | **Cloudflare Workers**, not the VPS. The VPS serves no static files. |
| Frontend → API | `VITE_API_URL=https://api.oxygenquiz.com/api`, baked into the bundle at build time (`.env.production`) |

Because the frontend is on Workers and the API is on the VPS, **every browser call is
cross-origin**. `Cors__AllowedOrigins__*` is load-bearing, not a formality: get it wrong and the
SPA cannot even read `/api/Authentication/auth-config`, so the social-login buttons never render.

### Where configuration lives

The live compose file has **no `env_file:` directive.** Config is set inline in the backend's
`environment:` block, and three secrets are pulled in by `${...}` interpolation:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

`--env-file` supplies **interpolation only** — it does not put variables inside the container.
`~/OxygenQuiz/.env.prod` therefore holds just the values referenced as `${...}`
(`POSTGRES_PASSWORD`, `JWT_KEY`, `ADMIN_PASSWORD`, and any secret you add the same way).
Everything else the backend reads must be written as an explicit `- Key__Sub=value` line in the
compose file. **Adding a variable to `.env.prod` alone does nothing** unless something in the
compose file references it.

### Forgetting `--env-file` on `up -d` breaks production

Compose interpolates an unset `${...}` to a **blank string**, not an error. So an `up -d` without
the flag recreates the stack with a blank `POSTGRES_PASSWORD`, `JWT_KEY`, `ADMIN_PASSWORD` and
every API key — and the backend's `Jwt:Key` guard then refuses to start at all. The
`WARN … variable is not set` lines are harmless noise on read-only commands like `logs`, `ps` and
`exec`, which is exactly what makes them easy to stop reading; on `up` they are the last warning
before an outage.

Compose reads a file named literally `.env` automatically. Making that the same file removes the
trap rather than relying on remembering:

```bash
ln -s .env.prod ~/OxygenQuiz/.env
```

Every compose command then resolves the secrets with or without the flag, and the warnings stop.
`.env` is in `.gitignore`, so the link is never committed.

### What is tracked, and what is not

As of `64f399e8` (2026-08-31) the live compose file **is in version control**, at the repo root as
`docker-compose.prod.yml`, byte-identical to the server's copy, alongside
`deploy/nginx/api.oxygenquiz.com.conf`. The path on the server did not change, so the deploy
command is unchanged. Earlier revisions of this file said the compose file was untracked and told
you to commit it — that was true when it was written and is the change that has since landed.

`~/OxygenQuiz/.env.prod` remains untracked **on purpose** — it holds the secrets. It exists only
on the VPS, so it is the one file a rebuild would lose. Keep a copy somewhere safe outside the box.

The two copies can still drift: nothing enforces that the server's compose file matches the
committed one. Edit the tracked file, commit, `git pull` on the server, and re-run the deploy
command — rather than editing the server's copy in place. To check they agree:

```bash
ssh deploy@89.167.23.147 'cd ~/OxygenQuiz && git status --short docker-compose.prod.yml && git log --oneline -1'
```

---

## Locking the edge — real client IP, and the origin firewall

Two separate jobs, done in this order. The first is what makes the rate limiter and the audit log see
real visitors ([ADR 0027](../adr/0027-the-client-ip-is-resolved-at-nginx.md)); the second keeps
everything except Cloudflare off the box.

### 1. Real client IP (Nginx) — before the backend that needs it

The backend from 2026-10-17 reads the visitor's address from what Nginx hands it. **Reload Nginx
first, then rebuild the backend.** In the other order the backend reads an old Nginx's appended
`X-Forwarded-For`, takes the last hop — a Cloudflare edge — and puts many visitors in one bucket.

```bash
ssh deploy@89.167.23.147
cd ~/OxygenQuiz && git pull

# a. The Cloudflare ranges snippet (writes /etc/nginx/snippets/cloudflare-real-ip.conf, tests, reloads)
sudo mkdir -p /etc/nginx/snippets
sudo bash deploy/nginx/update-cloudflare-ips.sh

# b. The site config that includes it and overwrites X-Forwarded-For
sudo cp deploy/nginx/api.oxygenquiz.com.conf /etc/nginx/sites-available/api.oxygenquiz.com
sudo nginx -t && sudo systemctl reload nginx

# c. Only now, the backend
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

**Check:** do something audited (e.g. edit a quiz) and look at the newest audit-log entry. It should
show your own public IP, not a Cloudflare address (`104.16–31.x`, `172.64–71.x`, `162.158–159.x`, …).

Cloudflare's ranges change rarely, with notice. Re-run step **a** after an announcement, or add the
monthly cron line at the top of `update-cloudflare-ips.sh`. It refuses to write a short list.

### 2. Origin firewall (Hetzner Cloud Firewall)

Today 80/443 accept anyone, so the API answers at its bare IP and skips Cloudflare's protection.
Test it from Windows. In **PowerShell, `curl` is an alias for `Invoke-WebRequest`** and doesn't take
curl's flags, so call the real binary, `curl.exe`:

```powershell
curl.exe -k -i -m 10 https://89.167.23.147/ -H "Host: api.oxygenquiz.com"
```

Any HTTP response (even a 404) means the origin is reachable directly. After the lockdown it should
time out.

Use the **Hetzner Cloud Firewall**, not `ufw`: it filters before traffic reaches the VM, so nothing
on the box (Docker's own iptables rules included) can open a hole in it.

Hetzner Console → **Firewalls** → the firewall attached to this server → **Inbound rules**:

| Rule | Protocol / port | Source |
|---|---|---|
| SSH | TCP 22 | Any IPv4, Any IPv6 (key-only login; narrow to your IP if it's static) |
| HTTPS | TCP 443 | Cloudflare's ranges — every line of https://www.cloudflare.com/ips-v4 and /ips-v6 |
| HTTP | TCP 80 | The same Cloudflare ranges |

Remove any other 80/443 rule that allows *Any*. Port 80 stays, Cloudflare-only: in Full (strict) mode
Cloudflare reaches the origin with the scheme the visitor used, so an `http://` request reaches 80
unless **SSL/TLS → Edge Certificates → Always Use HTTPS** is on (turn it on either way).

**Check:** the `curl.exe` above now times out, `https://api.oxygenquiz.com` still works, the site logs
in, and a multiplayer match connects (WebSockets). SSH still works because 22 is untouched. If
something is wrong, the Hetzner Console's own web console reaches the server regardless of the
firewall.

When Cloudflare announces new ranges, update this rule as well as the Nginx snippet.

### 3. Optional: a rate-limiting rule at Cloudflare

Drops floods on the login endpoints before they reach the VPS. Cloudflare dashboard →
**Security → WAF → Rate limiting rules** → Create:

- **If incoming requests match:** hostname equals `api.oxygenquiz.com` *and* URI path starts with
  `/api/Authentication/` (Cloudflare compares case-sensitively; this is the casing the API routes use)
- **Counting characteristic:** IP
- **Rate:** 30 requests per 10 seconds → **Block** for 10 seconds (the free plan's fixed period)

The app's own `auth` policy (20 a minute per IP) stays — this is the outer layer, sized to catch
floods, not to replace it.

## The unadopted stack (design B) — `deploy/`

`deploy/docker-compose.prod.yml`, `deploy/Caddyfile` and `deploy/.env.example` describe a
*different* deployment: a third container, **Caddy**, terminating TLS **and** serving the SPA from
`deploy/frontend-dist`, replacing both nginx and Cloudflare Workers. It reads config from
`deploy/.env` through `env_file:`.

It was authored two days after design A went live and **has never been deployed.** It is not
wrong, it is unbuilt. Treat everything under `deploy/` as a proposal.

Concretely, if you are looking at design B's files: `deploy/.env` does not exist on the server and
nothing reads it; `cp .env.example .env` configures nothing today.

### Which docs describe which

| Document | Describes |
|---|---|
| **This file** | A — live. The authority when these disagree. |
| `configuration.md` | A — live (`.env.prod`, `--env-file`). Backend config layers only; says nothing about frontend or infra config. |
| `cheatsheet.md` | A — live. The shortest path for a routine deploy. |
| `infrastructure.md` | A — live. The "why it's built this way" map. |
| `deployment-runbook.md` | A — live. Copy-paste server commands. |
| `deployment.md` | A — pre-launch *reasoning*, not the deployed state. Kept for the choices behind the design. |
| `deployment-progress.md` | A — a **log that stops at 2026-07-04**. History, not current state. |
| `vps-launch-checklist.md` | A — **historical**. Says Cloudflare *Pages*; the SPA is on *Workers*. Its DNS/TLS/hardening sequence is still sound. |
| `production-runbook.md` | **B — unadopted.** Its "Caddy + backend + Postgres on one VPS, frontend served by Caddy" topology is design B. |
| `deploy/.env.example` | **B — unadopted.** A useful *catalogue* of settings, but the file it tells you to create is not read by the live stack. |

---

## Adding a backend setting in production

1. If it is a secret, add it to `~/OxygenQuiz/.env.prod` as a plain name (`AI_API_KEY=…`).
2. Add an explicit line to the backend's `environment:` block in
   `~/OxygenQuiz/docker-compose.prod.yml`, referencing the secret if there is one:
   `- Ai__ApiKey=${AI_API_KEY}`. Non-secrets are written inline.
3. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`
4. **Verify it reached the process**, rather than assuming:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend printenv | grep -E 'Ai__|Authentication__'
   curl -s https://api.oxygenquiz.com/api/Authentication/auth-config
   ```
   The second command is the better check: it proves the value reached the app *and* that nginx
   and CORS are passing it through to where the SPA reads it.
5. Commit the compose-file change. The compose file is tracked (see above), so the durable
   sequence is: edit it here → commit → `git pull` on the server → re-run the deploy command.

### Worked example: turning the AI features on

`Ai:Enabled` is a **single switch for both AI features** — AI quiz generation and the
category-palette proposer share one `Ai` section, one vendor, one key and one budget. There is no
second flag for the palette helper.

**The vendor is not something production sets.** It lives in the `Ai:Vendors` catalogue in
`appsettings.json` and is selected by `Ai:Vendor`, so development and production run the same
vendor by construction. Production supplies only what is secret or environment-specific:

1. `~/OxygenQuiz/.env.prod` — add the secrets:

   ```
   AI_API_KEY=<your vendor key>
   GOOGLE_CLIENT_ID=<the OAuth Web application client id>
   ```

2. Root `docker-compose.prod.yml`, backend `environment:` block — add the referencing lines.
   Without these the names in `.env.prod` reach nothing:

   ```yaml
       - Ai__Enabled=true
       - Ai__ApiKey=${AI_API_KEY}
       - Authentication__Google__Enabled=true
       - Authentication__Google__ClientId=${GOOGLE_CLIENT_ID}
   ```

   That is the whole change. To run a **different** vendor in production than in development, add
   `- Ai__Vendor=deepseek` — one value, naming a catalogue entry. Overriding `Ai__BaseUrl` /
   `Ai__Model` / the cost rates individually still works and is warned about at startup; it is the
   form the catalogue exists to retire, because the five values must move together and setting some
   of them mis-prices the ledger silently.

3. Deploy and verify:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   docker compose -f docker-compose.prod.yml exec backend printenv | grep -E 'Ai__|Authentication__'
   curl -s https://api.oxygenquiz.com/api/Authentication/auth-config
   ```

   `GET /api/quiz/ai-quota` (authenticated) is the end-to-end check for AI: its `enabled` field
   answers "would a generation actually be attempted" — configuration, kill switch *and* spend caps
   — and it reports the active model id, which is how you confirm which vendor you are really on.

**A broken AI configuration does not stop the API.** Since `0004`, an unusable `Ai` section
switches the AI features off, logs the reason at `Error` on boot, and lets everything else start.
So after a config change, *check the logs* — a working site is no longer proof the AI settings took:

```bash
docker compose -f docker-compose.prod.yml logs backend | grep '\[AI\]'
```

`[AI] Ready — vendor "groq", model … at …` is what you want. `[AI] The AI features are switched
off because …` names the key to fix. The auth-provider guards still fail startup outright — an
enabled provider with a blank `ClientId` will not boot — so the two behave differently on purpose;
`docs/adr/0004-ai-misconfiguration-disables-the-feature.md` explains which failures earn which.

## Migrating to design B, if you ever do

Not recommended casually — Cloudflare in front of the frontend is a real benefit you would be
giving up, and the two designs differ in who serves the SPA, who terminates TLS, and how config is
supplied. If you do: build the SPA into `deploy/frontend-dist`, create `deploy/.env` from
`.env.example`, move the inline `environment:` values into it, stop nginx, point DNS at the box,
and delete the root compose file in the same change. Half-migrating gives you two things
competing for :443.
