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
  SPA built locally, `npm run build`   nginx (host package, systemd)
  + wrangler deploy                    TLS termination + reverse proxy
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

### The known weak point

`~/OxygenQuiz/docker-compose.prod.yml` and `.env.prod` are **untracked** — they exist only on
that VPS. The file defining production is not in version control, not reviewed, and not backed
up beyond the box. Rebuild the server and it is gone; read the repo and you will find a stack
that is not running. Commit the compose file (secrets stay in `.env.prod`) before doing anything
else with it.

---

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
| **This file** | A — live |
| `configuration.md` | A — live (`.env.prod`, `--env-file`) |
| `cheatsheet.md` | A — live |
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
5. Commit the compose-file change.

## Migrating to design B, if you ever do

Not recommended casually — Cloudflare in front of the frontend is a real benefit you would be
giving up, and the two designs differ in who serves the SPA, who terminates TLS, and how config is
supplied. If you do: build the SPA into `deploy/frontend-dist`, create `deploy/.env` from
`.env.example`, move the inline `environment:` values into it, stop nginx, point DNS at the box,
and delete the root compose file in the same change. Half-migrating gives you two things
competing for :443.
