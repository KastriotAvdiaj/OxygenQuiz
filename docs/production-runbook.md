# Production Runbook — oxygenquiz.com on Hetzner

Concrete, ordered steps to deploy OxygenQuiz to the Hetzner VPS behind Cloudflare.
Config files live in [`/deploy`](../deploy). Server IP: **89.167.23.147**. Domain: **oxygenquiz.com**.

Topology: one VPS runs **Caddy + backend + Postgres**; the **frontend** is built locally and
served as static files by Caddy. **Cloudflare** sits in front (DNS, TLS, DDoS). Postgres lives on
the box with a nightly backup.

> Do these in order. Several steps wait on DNS propagation, so kick off **Step 1** first, then do
> Steps 2–3 while it propagates.

---

## Step 0 — One required code change (forwarded headers)

Behind Caddy + Cloudflare the app must trust `X-Forwarded-Proto`, or it builds `http://` image URLs
that browsers block on the HTTPS site. Add this in `OxygenBackend/QuizAPI/Program.cs`, immediately
after `var app = builder.Build();` (before `app.UseCors(...)`):

```csharp
var forwardedOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                     | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
};
// Caddy is the only ingress and runs on the private compose network, so trust the chain.
forwardedOptions.KnownNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);
```

*(I can make this edit for you — just say so.)*

---

## Step 1 — Cloudflare (DNS + TLS)

1. Create a free Cloudflare account → **Add a site** → `oxygenquiz.com` → Free plan.
2. Cloudflare shows two **nameservers**. In **Spaceship** → your domain → set its nameservers to
   those two (replace Spaceship's). This moves DNS to Cloudflare; the domain stays registered at
   Spaceship. Propagation: minutes to a couple hours.
3. In Cloudflare → **DNS** → add three **A records**, all **Proxied (orange cloud)**:
   - `A  @    89.167.23.147`
   - `A  www  89.167.23.147`
   - `A  api  89.167.23.147`
4. **SSL/TLS** → set mode to **Full (strict)**.
5. **SSL/TLS → Origin Server → Create Certificate** (Let Cloudflare generate, hostnames
   `oxygenquiz.com` + `*.oxygenquiz.com`, 15-year). Copy the **Origin Certificate** and **Private
   Key** — you'll paste them onto the server in Step 3.

---

## Step 2 — Server prep (Docker + firewall)

SSH in (you set up the key during creation):

```bash
ssh root@89.167.23.147
```

Install Docker + Compose and create the app folder:

```bash
apt update && apt -y upgrade
curl -fsSL https://get.docker.com | sh
mkdir -p /opt/oxygenquiz/deploy
```

Add a Hetzner Cloud Firewall (in the Hetzner Console → Firewalls), attached to this server:
- Inbound allow **TCP 22** (SSH), **TCP 80**, **TCP 443**. Deny everything else.
- *(Hardening for later: once live, restrict 80/443 inbound to Cloudflare's published IP ranges so
  no one can bypass the proxy. See deployment.md §6.)*

---

## Step 3 — Copy config + secrets onto the server

From your Windows machine (in the repo root), copy the deploy folder up:

```bash
scp -r deploy root@89.167.23.147:/opt/oxygenquiz/
```

On the server:

```bash
cd /opt/oxygenquiz/deploy
cp .env.example .env
nano .env          # fill in real secrets (see the generate commands in the file)
```

Save the **Cloudflare Origin cert/key** from Step 1.5:

```bash
mkdir -p /opt/oxygenquiz/deploy/certs
nano /opt/oxygenquiz/deploy/certs/origin-cert.pem   # paste the certificate
nano /opt/oxygenquiz/deploy/certs/origin-key.pem    # paste the private key
chmod 600 /opt/oxygenquiz/deploy/certs/origin-key.pem
```

---

## Step 4 — Build the frontend and copy it up

On your Windows machine, set the API URL and build:

```bash
# in the repo root — set VITE_API_URL in .env.production:
#   VITE_API_URL=https://api.oxygenquiz.com/api
npm ci
npm run build           # produces dist/
scp -r dist/* root@89.167.23.147:/opt/oxygenquiz/deploy/frontend-dist/
```

---

## Step 5 — Bring it up

On the server:

```bash
cd /opt/oxygenquiz/deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f backend
```

On first boot the backend **runs migrations and seeds** (admin account + reference data). Watch for
the "Seeded admin account" log and no errors. `Ctrl+C` stops following logs (containers keep running).

---

## Step 6 — Smoke test (over real HTTPS)

- `https://oxygenquiz.com` loads the app.
- Sign up / log in works (the refresh cookie is set — confirms TLS + cookies end to end).
- Start a **multiplayer match in two browsers** — confirms WebSockets pass through Cloudflare + Caddy.
- Upload an image; confirm it displays over `https://` (validates Step 0).
- Log in as the seeded admin → **change the admin password**.

---

## Step 7 — Backups

```bash
chmod +x /opt/oxygenquiz/deploy/backup-postgres.sh
sudo crontab -e
# add:
0 3 * * * /opt/oxygenquiz/deploy/backup-postgres.sh >> /var/log/oxygenquiz-backup.log 2>&1
```

Periodically copy `/opt/oxygenquiz/backups` off-box (R2/S3) so a dead server doesn't take the
backups with it.

---

## Updating later

- **Backend change:** `git pull` on the server (or re-`scp`), then
  `docker compose -f docker-compose.prod.yml up -d --build backend`.
- **Frontend change:** rebuild locally, re-`scp dist/*` to `frontend-dist/`. Caddy serves it
  immediately (no restart needed).
- Once everything is verified, set `Security__EnforceProductionConfig=true` in `.env` and restart
  the backend, so any future misconfig fails loudly instead of silently warning.

---

## Notes

- **Invite-only:** implemented (see [`invite-code-system.md`](invite-code-system.md)). To gate the
  test, set `Signup__RequireInviteCode=true` in `.env` (already listed in `.env.example`). After the
  stack is up, mint codes as admin: `POST /api/admin/invite-codes { "count": 25 }` — copy them once
  (they can't be re-read) and hand them out. Reopen public signup later with `=false`, no redeploy.
- **Email:** the sender is still the dev-only logger (`LoggingEmailSender`), so verification emails
  are only logged, never delivered. Verification is a **soft gate** — testers can sign up and use
  everything without confirming, so this is fine for a closed test. Before a public launch, wire a
  real `IEmailSender` provider (see [`email-verification.md`](email-verification.md)).
- **Mongo:** removed — nothing to provision (see `mongodb.md`).
