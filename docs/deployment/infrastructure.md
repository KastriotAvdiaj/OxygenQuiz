# OxygenQuiz — Infrastructure & Deployment Architecture

> A plain-language map of **where every part of OxygenQuiz runs in production and why it's built that
> way**. This is the "how is this thing actually deployed" document. For the running log of what was
> done and when, see [`deployment-progress.md`](deployment-progress.md); for copy-paste operational
> commands, see [`deployment-runbook.md`](deployment-runbook.md); for the original strategy and the
> options we weighed, see [`deployment.md`](deployment.md).
>
> Last updated: 2026-07-04. Status: **backend live** at `https://api.oxygenquiz.com`; frontend
> deployment (custom domain on the Worker) is the remaining step.

---

## 1. The big picture in one paragraph

A user's browser talks to **Cloudflare**, never directly to our server. Cloudflare handles DNS, sits in
front as a CDN and shield, and terminates the public HTTPS connection. For anything under
`api.oxygenquiz.com`, Cloudflare forwards the request over a second encrypted hop to a single **Hetzner
virtual server** in Helsinki. On that server, **Nginx** listens on port 443, decrypts the traffic, and
hands it to the **.NET 8 backend** running in a **Docker** container that only listens on localhost. The
backend keeps its data in a **PostgreSQL** container next to it, and persists uploaded files and its
encryption keys on **Docker volumes** so they survive restarts. The static frontend (a Vite/React
single-page app) is served separately from **Cloudflare's own edge** as a Worker. That's the whole
system: Cloudflare at the edge, one hardened VPS running Docker behind Nginx, and the SPA on the CDN.

```
                          ┌─────────────────────────────────────┐
   Browser ── HTTPS ────▶ │             Cloudflare              │
   (visitor)              │   DNS · CDN · DDoS · TLS at edge     │
                          └───────┬──────────────────┬──────────┘
                                  │                  │
             oxygenquiz.com / www │                  │ api.oxygenquiz.com
             (static SPA)         │                  │ (HTTPS, "Full strict")
                                  ▼                  ▼
                       ┌────────────────┐   ┌────────────────────────────────────────┐
                       │ Cloudflare     │   │      Hetzner VPS (Helsinki)             │
                       │ Worker         │   │      89.167.23.147 · Ubuntu             │
                       │ "oxygenquiz"   │   │                                         │
                       │ serves dist/   │   │  ┌───────────────────────────────────┐  │
                       └────────────────┘   │  │ Nginx :443  (Origin cert, TLS)    │  │
                                            │  │   └─ proxy_pass ─▶ 127.0.0.1:5000 │  │
                                            │  └──────────────┬────────────────────┘  │
                                            │                 ▼                        │
                                            │  ┌───────────────────────────────────┐  │
                                            │  │ Docker: backend (.NET 8) :8080     │  │
                                            │  │   ├─ volume: uploads (/wwwroot)    │  │
                                            │  │   └─ volume: dpkeys (/app/keys)    │  │
                                            │  │ Docker: postgres                   │  │
                                            │  │   └─ volume: postgres-data         │  │
                                            │  └───────────────────────────────────┘  │
                                            └────────────────────────────────────────┘
```

---

## 2. The one constraint that shaped everything

Before the individual pieces make sense, the reason for the whole shape: **the backend must run as a
single, always-on, long-lived process.** This isn't a preference, it's baked into the app:

- **Multiplayer uses SignalR**, which holds open **WebSocket** connections. That needs a persistent
  process, not per-request serverless functions.
- **Live match state** lives in memory (`MatchOrchestrator` + `InMemoryQuizSessionManager` are
  in-memory singletons). A second instance couldn't see the first instance's matches.
- **Hangfire** runs an in-process background job server (e.g. the daily image cleanup).
- **File uploads** are written to local disk; a fresh instance starts with an empty disk.

Everything downstream follows from this: we run **one** container on **one** VM (not autoscaling, not
Lambda), we make sure WebSockets survive every hop (Cloudflare → Nginx → app), and we attach persistent
storage so a restart doesn't lose data. The trade-off we accepted: every deploy/restart drops in-flight
matches, which is fine at launch scale — deploy during quiet hours. The path past this limit (Redis
backplane, shared match store) is documented in [`deployment.md`](deployment.md) §9.

---

## 3. The domain — `oxygenquiz.com`

The domain is **registered at Spaceship** (the registrar). Registration and DNS-hosting are two
different jobs: Spaceship still *owns* the registration, but we moved the actual **DNS hosting to
Cloudflare** so that Cloudflare could sit in front of our traffic as a proxy.

We did that by changing the **nameservers** at Spaceship to Cloudflare's
(`houston.ns.cloudflare.com` + `treasure.ns.cloudflare.com`) and removing Spaceship's own
(`launch1/launch2.spaceship.net`). Once the nameservers point at Cloudflare, Cloudflare answers all DNS
queries for the domain, which is the precondition for using its proxy/CDN. We also confirmed **DNSSEC
was off** at Spaceship first — DNSSEC signs DNS responses, and leaving it on during a nameserver switch
would make resolvers reject Cloudflare's unsigned answers and break the domain. With DNSSEC off and the
nameservers switched, Cloudflare reported the zone **Active**.

---

## 4. Cloudflare — the edge (DNS, CDN, shield, TLS)

Cloudflare is the single most important piece for a single-instance backend, which is exactly why it's
here. It does several jobs at once:

**DNS.** It's the authoritative DNS host for the domain (see §3). The records that matter:

| Record | Points to | Proxied? | Purpose |
|---|---|---|---|
| `A api` | `89.167.23.147` (the VPS) | **Yes** (orange cloud) | The .NET API + SignalR hubs |
| `oxygenquiz.com` / `www` | Cloudflare Worker | Yes | The static SPA (custom-domain step pending) |

"Proxied" (the orange cloud) is the key setting: it means traffic flows **through** Cloudflare rather
than resolving straight to our server's IP. That's what gives us the CDN, DDoS protection, and hides the
origin IP. If a record were "DNS only" (grey cloud), visitors would hit the VPS directly and bypass all
of that.

**CDN + DDoS + WAF.** Because traffic is proxied, Cloudflare absorbs volumetric attacks (L3/L4/L7 DDoS
mitigation) before they ever reach our single instance — which can't scale out to absorb a flood on its
own. The free plan also gives Bot Fight Mode, basic WAF rules, and a few custom rate-limit rules we plan
to point at the sensitive endpoints (login, refresh, signup, guest-session creation). WebSockets are
supported by the proxy, so SignalR keeps working — we just avoid aggressive rate rules on the hub paths.

**TLS at the edge.** Cloudflare presents the certificate the browser sees, so public HTTPS is handled
for us at the edge. But that only secures the *first* hop (browser → Cloudflare). Securing the second
hop (Cloudflare → our server) is what §5 is about.

---

## 5. TLS end-to-end — why there are *two* certificates

This is the part that's easy to get confused about, so it's worth spelling out. There are **two separate
encrypted hops**, and each needs its own certificate:

1. **Browser → Cloudflare.** Secured by Cloudflare's own **Edge Certificate**, which it issues and
   manages automatically. This is the cert a visitor sees in their address bar.
2. **Cloudflare → our origin server.** Secured by a Cloudflare **Origin Certificate** that we generated
   and installed on the VPS. This cert is only trusted *by Cloudflare* (not by public browsers), which
   is fine because only Cloudflare ever talks to the origin.

We created the Origin Certificate in the Cloudflare dashboard (SSL/TLS → Origin Server → Create
Certificate) for `oxygenquiz.com` + `*.oxygenquiz.com`, RSA, 15-year validity, and installed it on the
VPS at `/etc/ssl/cloudflare/origin.pem` (the certificate) and `/etc/ssl/cloudflare/origin.key` (the
private key, locked to `chmod 600` so only root can read it). Nginx presents this cert on port 443.

Finally we set Cloudflare's encryption mode to **Full (strict)**. This is the strongest setting: it
means Cloudflare encrypts the hop to our origin **and verifies** that the origin's certificate is a
valid Cloudflare-issued (or CA-signed) cert. The looser "Full" mode would accept any cert including a
self-signed one; "Flexible" wouldn't encrypt the origin hop at all. We chose Full (strict) so there's no
unencrypted or unverified segment anywhere between the visitor and the app.

> **Order matters (and bit us once conceptually):** you must have Nginx serving 443 with the Origin cert
> *before* flipping Cloudflare to Full (strict). Flip it early and Cloudflare has nothing valid to
> connect to, so every request returns a `52x` error. Nginx first, verify, then change the mode.

---

## 6. The server — a Hetzner VPS

The backend and database run on a single **Hetzner Cloud** virtual server. We chose the "one VPS running
Docker" route over managed PaaS because the app's `docker-compose` already wires everything together and
it's the cheapest way to satisfy the always-on/WebSocket/persistent-disk requirement from §2. The
trade-off, accepted knowingly, is that **we** own OS patching, TLS install, and DB backups rather than a
platform doing it for us.

| Fact | Value |
|---|---|
| Host | `ubuntu-4gb-hel1-1` (Hetzner CX23: 2 vCPU / 4 GB RAM / 40 GB disk) |
| Location | Helsinki |
| Public IP | `89.167.23.147` |
| OS | Ubuntu |
| Login user | `deploy` (sudo, SSH-key-only) |
| Repo path | `/home/deploy/OxygenQuiz` (clone of the public GitHub repo) |

**Hardening we did and why:**

- **Updated + rebooted** onto the latest kernel so we're not launching on known-vulnerable packages.
- **Created a `deploy` sudo user** and **disabled root login** (`PermitRootLogin no`). Logging in as a
  named non-root user with sudo is standard practice — root over SSH is a big target and there's no
  reason to expose it.
- **Key-only SSH** (`PasswordAuthentication no`): passwords can be brute-forced, SSH keys effectively
  can't. Only this desktop's `ed25519` key is authorized.
- **`ufw` firewall** allowing only **SSH (22), HTTP (80), and HTTPS (443)**. Everything else is closed,
  including the database — Postgres is never exposed to the internet; it's reachable only from the
  backend container on the internal Docker network.

A planned follow-up (in the "still to do" list) is to **restrict ports 80/443 to Cloudflare's IP
ranges** so nobody can bypass Cloudflare by hitting the origin IP directly. That also protects the
rate-limiter, which trusts the `CF-Connecting-IP` header.

---

## 7. Docker — how the backend and database run

Everything on the server runs as **Docker** containers, orchestrated by a **`docker-compose.prod.yml`**
file that lives **only on the server** (not in Git, because it's environment-specific and references
secrets). We use Docker so the runtime is reproducible and a deploy is just "rebuild the image and
restart" — no fiddling with system-installed .NET or Postgres.

The compose stack has two services:

**`backend`** — built from `OxygenBackend/QuizAPI/Dockerfile` (a multi-stage .NET 8 build: SDK image
compiles and publishes, then a slim `aspnet:8.0` runtime image runs it as a non-root user). Inside the
container it listens on port **8080**. Crucially, we publish it to **`127.0.0.1:5000`** on the host —
bound to localhost only, **not** `0.0.0.0`. That means the backend is *not* directly reachable from the
internet; the only way in is through Nginx (§8). Production configuration (the real domain, CORS
origins, JWT issuer/audience, `ASPNETCORE_ENVIRONMENT=Production`) is injected via environment
variables.

**`postgres`** — the PostgreSQL database, on the internal Docker network only. The backend reaches it by
service name; nothing external can.

**Persistent storage via named volumes** — this is what keeps data alive across the frequent rebuilds a
deploy involves:

| Volume | Mounted at | Why it exists |
|---|---|---|
| `oxygenquiz_postgres-data` | Postgres data dir | The actual database. Losing this = losing all data. |
| `oxygenquiz_uploads` | backend `wwwroot/uploads` | User-uploaded files. Without a volume they'd vanish on every rebuild (§2). The Dockerfile pre-creates this dir owned by the non-root app user so the volume is writable (see §9). |
| `oxygenquiz_dpkeys` | backend `/app/keys` | ASP.NET **Data Protection** keys (see §9). |

> Operational note: `docker compose down` keeps these volumes; only `down -v` deletes them. We never use
> `-v` unless we truly mean to wipe data.

---

## 8. Nginx — the reverse proxy, and why we added it

The backend container listens only on `127.0.0.1:5000`. Something has to accept the public HTTPS
connection from Cloudflare on port 443, decrypt it, and forward it inward — that's **Nginx's** job. We
installed it directly on the VPS (not in a container) as the single front door to the backend. Its
reasons for existing:

1. **TLS termination for the origin hop.** Nginx holds the Cloudflare Origin certificate (§5) and serves
   port 443. This is what makes Full (strict) possible — Cloudflare connects to Nginx over verified TLS.
2. **Reverse proxy to the app.** Nginx `proxy_pass`es everything to `http://127.0.0.1:5000`, so the
   backend never has to be internet-facing itself. This keeps the app's attack surface tiny (only Nginx
   can reach it) and lets us change/restart the backend without touching the public listener.
3. **WebSocket support for SignalR.** Multiplayer and notifications ride WebSockets, which need an
   HTTP/1.1 "Upgrade" handshake. The proxy config explicitly forwards the `Upgrade` and `Connection`
   headers and uses `proxy_http_version 1.1`; without those, `/quizHub` and `/notificationHub` would
   silently fail to connect. We also raised `proxy_read_timeout`/`proxy_send_timeout` to an hour so a
   long-idle match connection isn't cut off.
4. **Passing the real client context to the app.** Nginx sets `X-Real-IP`, `X-Forwarded-For`, `Host`,
   and especially `X-Forwarded-Proto`. That last one tells the app the original request was HTTPS, which
   is what makes the backend generate correct `https://` URLs (see §9, forwarded headers).
5. **HTTP→HTTPS redirect.** A small second server block listens on port 80 and `301`-redirects
   everything to HTTPS, so a plain-HTTP request never reaches the app unencrypted.

The site config lives at `/etc/nginx/sites-available/api.oxygenquiz.com`, symlinked into
`sites-enabled/`. We always run `nginx -t` (a config dry-run) before `systemctl reload nginx`, so a typo
can't take the site down — reload applies the new config gracefully without dropping live connections.

---

## 9. The backend application (.NET 8) — production-specific pieces

A few things in the app itself exist specifically to make production behave correctly behind this
topology:

- **Forwarded headers.** Because two proxies (Cloudflare, then Nginx) sit in front, the app would
  otherwise think every request came from Nginx over plain HTTP. A `UseForwardedHeaders` block reads the
  `X-Forwarded-*` headers Nginx sets, so the app knows the real client IP and that the request was HTTPS
  — which it needs to build `https://` links and to make the rate-limiter partition on the real IP.

- **Data Protection keys on a volume.** ASP.NET uses a "Data Protection" key ring to sign/encrypt things
  like antiforgery tokens and protected cookies. By default those keys live inside the container, so
  every rebuild would generate new keys and invalidate everything signed with the old ones. We changed
  the app to persist the key ring to `/app/keys` and mounted the `dpkeys` Docker volume there, so keys
  survive rebuilds. (The Dockerfile pre-creates `/app/keys` owned by the non-root app user so it can
  write them.) A remaining "no XML encryptor configured" warning is expected and benign — the keys sit
  unencrypted at rest on a root-only volume, which is fine for a single server.

- **Uploads directory ownership.** User uploads are written to `wwwroot/uploads`, mounted to the
  `uploads` volume so they survive rebuilds (see the volume table in §7). The subtle part: the app runs
  as a **non-root** user, and a fresh named volume inherits the ownership of its mount point *from the
  image*. If `/app/wwwroot/uploads` doesn't exist in the image, Docker creates the mount point
  **root-owned**, and the first upload fails with a permission-denied `500`. So the Dockerfile
  pre-creates `/app/wwwroot/uploads` owned by the non-root app user — exactly the same fix as the Data
  Protection keys above. Note this ownership is seeded only when the volume is first created: if a
  root-owned `uploads` volume already exists from an earlier deploy, rebuilding the image alone won't
  re-chown it — remove the volume (loses existing files) or `chown` it once inside the container.

- **Hangfire scheduling fix.** Hangfire's recurring jobs were originally registered via the *static*
  `RecurringJob.AddOrUpdate`, which depends on a global that only got initialized as a side effect of
  mapping the Hangfire dashboard — and we deliberately skip that dashboard in Production. The result was
  a crash on boot in prod. We moved to scheduling through the DI-registered `IRecurringJobManager`, which
  works in every environment.

- **MongoDB removed from the deployment.** MongoDB previously backed *write-only* lobby-chat archival —
  an audit sink nothing ever reads back. Since lobby chat is ephemeral by design (SignalR in-memory) and
  notifications live in Postgres, we disabled Mongo entirely: the `IMongoClient` registration is
  commented out and the chat archiver is swapped to a `NoOpLobbyChatArchiver`. That removes an entire
  database dependency from production. The Mongo-backed class and driver package are kept in the code so
  the feature can be revived later (see [`mongodb.md`](../data/mongodb.md)). *(This is also what a build fix on
  2026-07-04 finally completed — an earlier partial edit had removed the `using` but left the
  registration, breaking CI.)*

---

## 10. The frontend — Cloudflare Worker

The frontend is a **Vite + React single-page app**. It's built to static files (`npm run build` → a
`dist/` folder) and served from **Cloudflare's edge as a Worker** named `oxygenquiz`, configured by
`wrangler.jsonc` in the repo root. The Worker just serves the static assets, with
`not_found_handling: "single-page-application"` so unknown paths fall back to `index.html` and
client-side (react-router) routing works.

Serving the SPA from the CDN (rather than from our VPS) keeps static assets fast and globally cached, and
keeps that load off the single backend instance. The app is pointed at the API via
`VITE_API_URL=https://api.oxygenquiz.com/api`, baked into the bundle at build time.

**Remaining step:** rebuild with that API URL and attach `oxygenquiz.com` + `www.oxygenquiz.com` as
**custom domains** on the Worker (Workers & Pages → oxygenquiz → Domains & Routes), which also replaces
the old parking-IP DNS records. Until then the API is live but the public site isn't yet on the root
domain.

---

## 11. Secrets & configuration

Nothing sensitive is in source control. Production secrets live in **`~/OxygenQuiz/.env.prod`** on the
server (`chmod 600`, not in Git) and are also saved in a password manager. That file holds:

- `POSTGRES_PASSWORD` — the database password.
- `JWT_KEY` — the signing key for auth tokens.
- `ADMIN_PASSWORD` — the seeded admin account's password (to be changed after first login).

Compose commands that need these are always run with `--env-file .env.prod`. Domain-dependent settings
(`AllowedHosts`, CORS origins, JWT issuer/audience) are set via environment variables too. The app has a
startup safety-check that warns if any of these are still at insecure defaults; a later step turns that
check **fatal** (`Security__EnforceProductionConfig=true`) once the real domain is fully serving, so a
misconfigured deploy refuses to boot rather than launching insecure.

### How `appsettings` is loaded in production (and why some values look "wrong")

> For the full, study-oriented version of this — the `__` nesting convention, arrays, how to inspect the
> effective config, and the traps — see the dedicated [`configuration.md`](configuration.md). Short
> version below.

.NET builds its configuration in **layers**, each overriding the one before it:

1. **`appsettings.json`** — the base. Loaded in **every** environment. Holds safe defaults, several of
   which are dev-oriented (`AllowedHosts: "*"`, `localhost` JWT issuer/audience). These look wrong for
   production but are meant to be overridden.
2. **`appsettings.{Environment}.json`** — loaded **only** when `ASPNETCORE_ENVIRONMENT` matches. In
   production that's **`appsettings.Production.json`**. Crucially, **`appsettings.Development.json` is
   never read in production** — so the localhost URLs, the sample seed data, and the
   `Seed:AdminEmail = kaloti…` value in that file do **not** apply to the live server.
3. **Environment variables** — override everything above (nested keys use `__`, e.g.
   `Cors__AllowedOrigins__0`, `Seed__AdminPassword`, `Jwt__Issuer`). This is how the compose file
   injects the real domain, CORS, JWT settings, and the secrets from `.env.prod` at runtime.
4. **User-secrets** — development only; never in production.

So the **effective production config** = `appsettings.json` + `appsettings.Production.json` + env vars.
A value in `appsettings.json` being "incorrect" is usually harmless because an env var replaces it at
runtime. The real trap is a setting that has **neither** an env-var override **nor** an entry in
`appsettings.Production.json` — it silently falls back to the base file or a hard-coded default.

> **Concrete example (the login gotcha):** the admin account is seeded from `Seed:AdminEmail`, which
> defaults to **`admin@example.com`** in code. That key is only given the `kaloti…` value in
> `appsettings.Development.json` (not loaded in prod). So unless `Seed__AdminEmail` is set as an env
> var, the production admin's email is `admin@example.com` — log in with that, not the dev email.

### Finding the admin login (bookmark this)

Login is **by email + password**:

- **Password** = `ADMIN_PASSWORD` in `~/OxygenQuiz/.env.prod` (and your password manager):
  `ssh deploy@89.167.23.147` then `grep ADMIN_PASSWORD ~/OxygenQuiz/.env.prod`.
- **Email** = `Seed__AdminEmail` if it was set at first boot, otherwise **`admin@example.com`**.
- The admin is seeded **once**; changing `ADMIN_PASSWORD` afterward does nothing to an existing account.
  Full commands (incl. querying the DB for the exact email) are in
  [`deployment-runbook.md`](deployment-runbook.md) → "Where's the admin password?".

---

## 12. Request lifecycle — following one API call

Putting it together, here's what happens when the live app makes a request to `api.oxygenquiz.com`:

1. The browser resolves `api.oxygenquiz.com` via Cloudflare DNS and connects to **Cloudflare** over
   HTTPS (Edge cert).
2. Cloudflare applies its protections (DDoS, WAF, rate rules), then opens a second HTTPS connection to
   our origin IP, verifying the **Origin cert** (Full strict).
3. That connection lands on **Nginx :443** on the VPS, which decrypts it and `proxy_pass`es to
   **`127.0.0.1:5000`**, adding the `X-Forwarded-*` headers (and upgrading the connection if it's a
   WebSocket).
4. The **.NET backend** (listening on 8080 inside Docker, published to localhost:5000) handles the
   request — reading `X-Forwarded-Proto` to know it's HTTPS, talking to **Postgres** over the internal
   Docker network, reading/writing **uploads** and **Data Protection keys** on their volumes.
5. The response travels back out the same chain: app → Nginx → Cloudflare → browser.

We verified this whole path end-to-end on 2026-07-04: a request to `/api/AuditLogs` returned a real app
`401 Unauthorized` (with `Www-Authenticate: Bearer` and `Server: cloudflare`) — proving the request went
all the way through Cloudflare → Nginx → the authenticated backend, not a Cloudflare error page.

---

## 13. Where the real build differs from the original plan

The original strategy doc ([`deployment.md`](deployment.md)) recommended *managed* Postgres (Neon/
Supabase) and object storage (S3/R2) for uploads, to offload backups and durability. What we actually
built is the **cheaper single-VPS variant**: Postgres self-hosted in Docker and uploads on a Docker
volume. That's a deliberate, valid choice for launch scale — but it means **we own the backups**. The
matching follow-up (in the "still to do" list) is a `pg_dump` backup cron to object storage plus basic
uptime monitoring. Worth remembering that this is the one place the running system trades convenience for
cost, and where a missed backup would actually hurt.

---

## 14. At-a-glance summary

| Layer | What we use | Where it runs | Why |
|---|---|---|---|
| Registrar | Spaceship | — | Owns the domain registration |
| DNS / edge | Cloudflare (Free) | Cloudflare | DNS, CDN, DDoS/WAF, hides origin, edge TLS |
| Public TLS | Cloudflare Edge cert | Cloudflare | Secures browser → Cloudflare |
| Origin TLS | Cloudflare Origin cert (15y) | Nginx on VPS | Secures Cloudflare → origin (Full strict) |
| Reverse proxy | Nginx | VPS (host) | TLS termination, WebSocket upgrade, forwards to app |
| Compute | 1× Hetzner CX23 VPS | Helsinki | Single always-on host (SignalR + in-memory state) |
| Backend | .NET 8 API, Docker | VPS, `127.0.0.1:5000` | The application + SignalR hubs |
| Database | PostgreSQL, Docker | VPS, internal network | Primary data store |
| Storage | Docker named volumes | VPS | Uploads, DP keys, Postgres data survive rebuilds |
| Frontend | Vite/React SPA → Worker | Cloudflare edge | Fast static hosting, off the backend |
| Secrets | `.env.prod` (chmod 600) | VPS + password manager | Kept out of Git |

---

## Related docs

- [`deployment.md`](deployment.md) — the strategy and the options we weighed (managed vs. VPS, serverless, scaling path).
- [`deployment-progress.md`](deployment-progress.md) — dated running log of what's been done.
- [`deployment-runbook.md`](deployment-runbook.md) — copy-paste operational commands (connect, deploy, Nginx setup).
- [`rate-limiting.md`](../development/rate-limiting.md) — the app-level limiter and the `CF-Connecting-IP` trust model.
- [`mongodb.md`](../data/mongodb.md) — how to re-enable MongoDB if the persistent chat system returns.
