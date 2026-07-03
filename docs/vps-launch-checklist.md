# VPS Launch Checklist (Hetzner backend + Cloudflare Pages frontend)

> Companion to [`deployment.md`](./deployment.md). That doc explains *why*; this one is the
> concrete, ordered "do this" for the split you chose:
> **frontend on Cloudflare Pages, backend + SignalR on the Hetzner CX23 VPS, Cloudflare in front of both.**
> Server: `ubuntu-4gb-hel1-1` · `89.167.23.147` · Ubuntu, 2 vCPU / 4 GB / 40 GB.

---

## 0. The MongoDB decision (do this first — it changes your compose file)

**Verdict: you do NOT need MongoDB in production.** Verified against the code:

- The *only* runtime use of Mongo is `LobbyChatArchiver` (`Services/QuizSessionServices/ILobbyChatArchiver.cs`).
  Its own docstring: *"Write-only: nothing in the app reads these back… fire-and-forget and swallows failures."*
  It's a best-effort audit sink for lobby chat lines, not the chat itself.
- Live lobby chat runs through SignalR in-memory (`InMemoryQuizSessionManager`) and is broadcast to
  players directly — it works with or without Mongo. Your "chats are ephemeral" understanding is correct.
- **Notifications are NOT in Mongo** (despite what `deployment.md` §2's diagram implies). `NotificationRepository`
  uses `ApplicationDbContext` → Postgres. So Postgres is the only data store you actually need.
- The whole `Chat-System/` folder and `MongoDB/Models/Chat.cs` are **dead code** — not registered in DI,
  not mapped as a hub or controller. Nothing runs them.

**One caveat before you just delete it:** `Program.cs` registers `IMongoClient` as
`new MongoClient(connectionString)`. If that connection string is missing/null, the client throws when
`LobbyChatArchiver` is first constructed (on first multiplayer use), which would break matches. So you
can't simply drop the env var — pick one of these:

- **Recommended (clean): make the archiver optional in code.** Register a no-op archiver when
  `ConnectionStrings:MongoDBConnection` is empty, so no Mongo is contacted and no warnings are logged.
  Small change in `Program.cs` — I can make it for you. Then you drop the Mongo service entirely.
- **Zero-code fallback:** keep the env var set to a syntactically valid but unused value
  (e.g. `mongodb://127.0.0.1:27017`) and just don't run a Mongo container. The app boots and chat works;
  every archived line logs one harmless warning. Ugly in logs, but functional.

Either way: **no MongoDB container, no Mongo Atlas.** The production compose below omits it.

---

## 1. DNS — point the domain at Cloudflare and the server

1. Add your domain to **Cloudflare** (free plan) and switch its nameservers at your registrar to the
   two Cloudflare gives you. (If you bought at Cloudflare Registrar, this is already done.)
2. Create DNS records, **orange cloud (proxied) ON** for all three:

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `api` | `89.167.23.147` | Proxied |
   | CNAME | `@` (root) | your `*.pages.dev` target (step 6) | Proxied |
   | CNAME | `www` | your `*.pages.dev` target | Proxied |

3. SSL/TLS mode → set to **Full (strict)** once the origin cert is installed (step 4).

---

## 2. Server baseline hardening

SSH in as root, then:

```bash
# create a sudo user
adduser deploy
usermod -aG sudo deploy

# copy your SSH key to the new user (run from YOUR machine, or paste the key manually)
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # if key already in root

apt update && apt -y upgrade

# firewall — SSH + HTTP/HTTPS only for now (locked down further in step 8)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# optional but recommended
apt -y install fail2ban
```

Then disable root/password SSH login in `/etc/ssh/sshd_config`
(`PermitRootLogin no`, `PasswordAuthentication no`) and `systemctl restart ssh`.
**Keep your current SSH session open** while you test logging in as `deploy` in a second terminal.

---

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy      # so 'deploy' can run docker without sudo
```

Log out/in as `deploy` for the group to take effect. You'll reuse the repo's `Dockerfile` +
a trimmed production compose (below).

---

## 4. Provision data + TLS

**Postgres** — two options:
- **On the VPS (cheapest):** included in the compose below. *You own backups* — set up
  `pg_dump` to Cloudflare R2/S3 on a cron. Don't skip this.
- **Managed (safer):** Neon/Supabase free tier; point `ConnectionStrings__PostgresConnection` at it
  and delete the `postgres` service from compose. Automated backups included.

**Uploads:** the backend writes to `wwwroot/uploads` on local disk. On a single VPS with a persistent
volume this survives restarts (but NOT a container rebuild unless volume-mounted — see compose).
For real durability, move to R2/S3 later (deployment.md §9).

**Origin TLS cert (so Cloudflare Full-strict works):**
In Cloudflare dashboard → SSL/TLS → Origin Server → **Create Certificate**. Save the cert + key onto
the server (e.g. `/etc/ssl/cloudflare/`). Nginx uses them in step 5.

---

## 5. Reverse proxy (Nginx) in front of the backend

The .NET app listens on `8080` inside its container (mapped to `5000` on the host in the compose below).
Nginx terminates TLS and proxies to it, **with WebSocket upgrade headers** so SignalR works.

`/etc/nginx/sites-available/api.oxygenquiz.com`:

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

        # don't let SignalR connections time out early
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
apt -y install nginx
ln -s /etc/nginx/sites-available/api.oxygenquiz.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> Cloudflare already terminates TLS at the edge; this origin cert secures the Cloudflare→VPS hop so you
> can run **Full (strict)**. Caddy is a fine alternative that auto-manages certs — but with Cloudflare
> proxying, the origin cert approach above is simplest.

---

## 6. Production compose (no Mongo)

Create `docker-compose.prod.yml` on the server. This mirrors the repo's compose but drops the Mongo
service and the frontend (frontend goes to Cloudflare Pages, not the VPS):

```yaml
services:
  backend:
    build:
      context: ./OxygenBackend/QuizAPI
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:5000:8080"     # bound to localhost; only Nginx reaches it
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - uploads:/app/wwwroot/uploads   # persist uploads across container rebuilds
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__PostgresConnection=Host=postgres;Database=OxygenQuiz;Username=postgres;Password=${POSTGRES_PASSWORD}
      # If you keep the zero-code Mongo fallback, uncomment the next line.
      # If you apply the optional-archiver code change, delete it entirely.
      # - ConnectionStrings__MongoDBConnection=mongodb://127.0.0.1:27017
      - Jwt__Key=${JWT_KEY}
      - Jwt__Issuer=https://api.oxygenquiz.com
      - Jwt__Audience=https://oxygenquiz.com
      - Seed__AdminPassword=${ADMIN_PASSWORD}
      - AllowedHosts=api.oxygenquiz.com
      - Cors__AllowedOrigins__0=https://oxygenquiz.com
      - Cors__AllowedOrigins__1=https://www.oxygenquiz.com
      - Security__EnforceProductionConfig=true

  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: OxygenQuiz
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
  uploads:
```

Put the real secrets in a `.env` file next to it (chmod 600, never committed):
`POSTGRES_PASSWORD=…`, `JWT_KEY=…` (long random), `ADMIN_PASSWORD=…` (strong, change after first login).

Deploy:

```bash
git clone <your-repo> && cd OxygenQuiz
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f backend   # watch it migrate + seed on first boot
```

On first boot the app auto-runs EF migrations and seeds the admin + reference data (fine while
single-instance). Watch for the startup config safety-check warnings — with
`Security__EnforceProductionConfig=true`, a still-default domain/CORS value will **fail** the boot,
which is what you want as a launch gate.

---

## 7. Deploy the frontend to Cloudflare Pages

1. Cloudflare → Pages → connect your Git repo (or `wrangler pages deploy dist`).
2. Build command `npm run build`, output dir `dist/` (Vite).
3. Set env var **`VITE_API_URL=https://api.oxygenquiz.com/api`** for the production build.
4. Add custom domains `oxygenquiz.com` + `www` in the Pages project → this creates/validates the
   root/`www` DNS records from step 1.

---

## 8. Lock the origin to Cloudflare (critical — from deployment.md §6)

The rate-limiter trusts the `CF-Connecting-IP` header. If anyone can hit `89.167.23.147` directly,
that header is spoofable. Restrict inbound 80/443 to **Cloudflare's IP ranges only**:

```bash
ufw delete allow 80/tcp
ufw delete allow 443/tcp
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do ufw allow from $ip to any port 443 proto tcp; done
for ip in $(curl -s https://www.cloudflare.com/ips-v6); do ufw allow from $ip to any port 443 proto tcp; done
# (repeat for port 80 if you want the HTTP→HTTPS redirect reachable; otherwise Cloudflare handles it)
```

Then in Cloudflare: **Bot Fight Mode** on, and add rate-limit rules on
`/api/Authentication/login`, `/refresh`, signup, and `/api/guest-quiz-sessions`.
**Do not** rate-limit `/quizHub` or `/notificationHub` (WebSockets).

---

## 9. Smoke test over real HTTPS (deployment.md §8.9)

- [ ] Signup → email/login flow works
- [ ] Guest play: one free quiz, then the cookie gate triggers
- [ ] **Full multiplayer match in two browsers** — confirms WebSockets survive Cloudflare + Nginx
- [ ] File upload persists across a `docker compose up -d --build` (volume works)
- [ ] Admin dashboard reachable; **Hangfire dashboard NOT reachable** in prod
- [ ] Change the seeded admin password

---

## 10. Right after launch

- Set up a **Postgres backup cron** (`pg_dump` → R2/S3) if you self-host the DB — this is the biggest
  risk of the all-on-VPS route.
- Basic monitoring/uptime check on `https://api.oxygenquiz.com`.
- Plan deploys for quiet hours — every restart drops in-flight matches (deployment.md §1).
