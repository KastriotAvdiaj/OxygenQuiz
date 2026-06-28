# Deployment & Go-Live Runbook

> **Status: pre-launch reference (written 2026-06-22).**
> This is the single place to look for "where does X live in production and how do I ship it."
> Security items that block launch are tracked in [`known-issues.md`](./known-issues.md);
> auth specifics are in [`authentication.md`](./authentication.md). Local-dev setup is in
> [`README.md`](./README.md) — this doc is strictly about **production**.

## How to use this doc

- Shipping for the first time? Read **§1–§3**, then follow the **§8 launch-day runbook** top to bottom.
- Choosing infrastructure? **§2** (hosting) and **§4** (domain).
- Worried about abuse / attacks? **§6**.
- Wondering about serverless / AWS Lambda? **§7**.
- Planning for growth? **§9**.

---

## 1. The one constraint that shapes every choice

OxygenQuiz's backend **must run as a single, always-on, long-lived instance**. This is not a
preference — it's baked into the current architecture:

| Feature | Why it pins us to one always-on instance |
|---|---|
| **Multiplayer (SignalR)** | Holds open WebSocket connections; needs a persistent process, not per-request functions. |
| **Live match state** | `MatchOrchestrator` + `InMemoryQuizSessionManager` are in-memory singletons. A second instance can't see the first's matches. |
| **Hangfire** | Runs an in-process background job server (e.g. the daily image cleanup). |
| **File uploads** | Written to local `wwwroot/uploads`; a fresh container/instance starts with an empty disk. |

**Consequences, up front:**
- ❌ **Do not** deploy the backend to AWS Lambda / serverless functions, or to any autoscaling
  setup that runs 2+ instances. (See §7 for the full why.)
- ✅ **Do** deploy it as one container or one VM with WebSocket support and a persistent disk
  (or external object storage for uploads).
- ⚠️ Every deploy/restart **drops in-flight matches**. Acceptable at launch scale; plan deploys
  for quiet hours. The path past this limit is in §9.

---

## 2. Recommended topology

```
                         ┌─────────────────────────┐
   user ───── HTTPS ───▶ │       Cloudflare        │  DNS · CDN · DDoS · WAF · rate limits
                         └───────────┬─────────────┘
                     ┌───────────────┴───────────────┐
                     ▼                                ▼
        oxygenquiz.com / www              api.oxygenquiz.com
        (static SPA, CDN)                 (single .NET 8 container/VM)
        Cloudflare Pages / Vercel          │            │
                                           │            └── uploads ▶ S3 / Cloudflare R2
                                           └── Managed Postgres (Neon / Supabase / RDS)
```

### Component choices

| Layer | Recommended (solo / low-cost) | Solid alternatives | Notes |
|---|---|---|---|
| **Frontend** | Cloudflare Pages | Vercel, AWS Amplify, S3+CloudFront | Static Vite build (`npm run build` → `dist/`). Free tier is plenty. |
| **Backend** | Railway or Render (container) | Fly.io, Azure App Service, a Hetzner/DigitalOcean VPS | Must support WebSockets + persistent process. The VPS route can reuse your existing `docker-compose.yml`. |
| **PostgreSQL** | Neon (or Supabase) | Render Postgres, AWS RDS, Azure Postgres Flexible | **Use managed** — you get automated backups / point-in-time restore. Don't self-host your primary data store unless you'll own backups. |
| **MongoDB** | *Not needed* | — | **Disabled** — multiplayer chat is ephemeral, nothing is persisted. Only required if you re-enable the persistent chat system (see [`mongodb.md`](./mongodb.md)). |
| **Uploads** | Cloudflare R2 (or S3) | Persistent volume on the host | See §1 — local disk is wiped on redeploy. |
| **Edge / DNS / DDoS** | Cloudflare (free) | AWS CloudFront + WAF | The single most important piece for protecting a single-instance backend. |

> **Why not "just one VPS with everything"?** You can — it's the cheapest, and your
> `docker-compose.yml` already wires Postgres + both apps. The trade-off is *you* own OS
> patching, TLS renewal, DB backups, and monitoring. Managed services cost a little more and
> remove those chores. For a first launch, the managed-PaaS path gets you live faster with fewer
> ways to lose data.

---

## 3. Pre-deploy checklist

**Security (block launch until done — see [`known-issues.md`](./known-issues.md)):**
- [x] **P1** — `QuizSessionsController` now requires auth and enforces per-session ownership (IDOR closed); acting user comes from the JWT, not client input. *(2026-06-23)*
- [x] **P2** — `TotalsController` gated to admins; exports confirmed attachment-disposition + global `nosniff` header; signup password policy raised to 12 chars with a breached-password blocklist. *(2026-06-23)*
- [x] SVG upload removed, Hangfire dashboard gated to non-prod, public user-email endpoints gated, build artifacts untracked.

**Config & secrets (nothing sensitive in source control):**
- [ ] `Jwt:Key`, `ConnectionStrings:PostgresConnection`,
      `Seed:AdminPassword` supplied via the **host's environment variables / secret manager** —
      never committed. (Locally these come from .NET user-secrets; production is the env-var equivalent.)
- [ ] `AllowedHosts` set to your real domain(s), not `"*"`.
- [ ] CORS `Cors:AllowedOrigins` set to exactly `https://oxygenquiz.com` (and `www` if used).
- [ ] `ASPNETCORE_ENVIRONMENT=Production` (this is what keeps the Hangfire dashboard unmapped and Swagger off).
- [ ] A strong, unique `Seed:AdminPassword`; change the admin password after first login.

> **Startup safety-guard.** On boot in Production the app self-checks the domain-dependent
> settings above (`AllowedHosts`, `Cors:AllowedOrigins`, `Jwt:Issuer`/`Audience`) and logs a loud
> warning for anything still set to a launch-blocking default (`*`, empty, `localhost`, or non-HTTPS).
> It only **warns** by default so a staging box still boots; set `Security:EnforceProductionConfig=true`
> (env: `Security__EnforceProductionConfig=true`) to make those checks **fatal** and use them as a hard
> launch gate once your real domain is wired up. → `OxygenBackend/QuizAPI/Program.cs`

**Data & assets:**
- [ ] Uploads pointed at S3/R2 (or a persistent volume confirmed to survive redeploys).
- [ ] A real email sender configured if you gate on verification (today it's `LoggingEmailSender` — dev only; see [`email-verification.md`](./email-verification.md)).

**Build sanity:**
- [ ] `dotnet build` clean; `npm run build` produces `dist/`.
- [ ] Migrations apply on a fresh DB (they run automatically at startup — fine while single-instance).

---

## 4. Domain & DNS

**Where to buy:** **Cloudflare Registrar** (at-cost pricing, no renewal markup, integrates with the
Cloudflare proxy you'll use for DDoS). Good alternatives: **Porkbun**, **Namecheap**. Avoid GoDaddy.

**DNS layout (proxied through Cloudflare — "orange cloud" on):**

| Record | Points to | Purpose |
|---|---|---|
| `oxygenquiz.com`, `www` | Frontend host (Pages/Vercel) | The SPA |
| `api.oxygenquiz.com` | Backend container/VM | The .NET API + SignalR hub |

**Cookie tightening you unlock by using subdomains:** `api.*` and the app on the same registrable
domain are **same-site**. That lets you change the refresh-token cookie from `SameSite=None` to
`SameSite=Lax` with `Domain=.oxygenquiz.com` — stricter than today's cross-site setting. Even
cleaner: serve the API under the *same* host at `/api` via a reverse proxy and drop CORS entirely.
(See `SetRefreshCookie` in `Controllers/Authentication/Authentication.cs`.)

---

## 5. Production hardening summary

These mostly map to items already in [`known-issues.md`](./known-issues.md); collected here as a deploy gate.

- **HTTPS everywhere.** Terminate TLS at Cloudflare and at the host. Keep `RequireHttpsMetadata` on (it already is outside Development).
- **`AllowedHosts`** → real domain (blunts host-header attacks).
- **CORS** → exact origin only; keep `AllowCredentials` (needed for the refresh cookie) but pin the origin.
- **Hangfire dashboard** is already unmapped in Production — keep `ASPNETCORE_ENVIRONMENT=Production`.
- **Migrations at startup** are fine now; move to a one-off deploy step *only* when you go multi-instance (§9).
- **Secrets** from the platform's secret store; rotate `Jwt:Key` if it was ever exposed.

---

## 6. Rate limiting & DDoS protection

Defense in depth — three layers, outermost first. The outer layer matters most precisely *because*
the backend is a single instance that can't absorb a flood by scaling out.

### Layer 1 — Cloudflare (the big one)
Proxy all traffic through Cloudflare (orange cloud). Free tier gives you:
- L3/L4/L7 **DDoS mitigation** (volumetric attacks never reach your instance).
- **Bot Fight Mode** + basic WAF managed rules.
- A few custom **rate-limiting rules** — apply them to the sensitive endpoints: `/api/Authentication/login`,
  `/api/Authentication/refresh`, signup, and `/api/guest-quiz-sessions`.
- ⚠️ **WebSockets are supported** by the proxy, so SignalR (`/quizHub`, `/notificationHub`) keeps working — just don't put an aggressive rate rule on the hub paths.

### Layer 2 — app-level rate limiting (.NET 8 built-in) ✅ implemented
Defense in depth for anything that slips past the edge, plus targeted protection on high-risk
endpoints. **This is done** — full details, limits, tuning, and testing in
[`rate-limiting.md`](./rate-limiting.md). In short: a generous global per-IP safety net (excluding
the SignalR hubs), a strict `auth` policy on login/signup/refresh/email-token endpoints, and a
`guest` policy on guest-session creation; rejections return 429 + `Retry-After`.

⚠️ **Read the real client IP, not Cloudflare's** — the limiter partitions on `CF-Connecting-IP`, and
in production you must **firewall the origin to Cloudflare's IP ranges** so that header can't be
spoofed by hitting the origin directly. See [`rate-limiting.md` § Trusting the client IP](./rate-limiting.md).

### Layer 3 — reverse proxy (VPS route only)
If you self-host on a VPS, add nginx in front with `limit_req` and TLS termination.

> **Honest caveat:** app-level limits and soft limits (like the guest-play cookie) curb casual
> abuse but won't stop a real DDoS — **Cloudflare is what saves you there.** Get Layer 1 on before launch; Layers 2–3 are hardening you can add immediately after.

---

## 7. Serverless / AWS Lambda — is it for an app like this?

Short answer: **not for your backend as it stands, but it has legitimate uses elsewhere.** Your
`appsettings` mentions Lambda, so here's the straight story.

### What Lambda is good at
Lambda (and serverless functions generally) shine for **stateless, event-driven, short-lived**
work where you want to pay per request and scale to zero when idle:
- Stateless HTTP request/response APIs with no long-lived connections.
- Event glue: "when a file lands in S3, make a thumbnail," "when a queue message arrives, process it."
- Scheduled one-off jobs.
- Spiky/low traffic where paying for an always-on server is wasteful.

### Why it's the wrong home for *this* backend
Your app violates Lambda's core assumptions in three ways:
- **SignalR needs persistent WebSocket connections.** Lambda functions are short-lived and don't
  hold sockets. (AWS *can* do WebSockets via API Gateway + Lambda, but only by re-architecting the
  hub to store every connection in DynamoDB and route messages through the gateway — a completely
  different model from SignalR's in-process hub. Not worth it for you.)
- **In-memory match state** would vanish between invocations — each Lambda call is a fresh, isolated
  execution. Your live matches live in process memory.
- **Hangfire** expects a continuously running worker; Lambda has no always-on process.

Plus cold starts add latency to a real-time game, and there's no persistent local filesystem for uploads.

> Note: ASP.NET Core *can* technically run on Lambda (via `Amazon.Lambda.AspNetCoreServer`). That's
> probably why it showed up in your config. But "it can boot" ≠ "it works for this workload" — the
> SignalR hub still breaks. Don't be misled by the adapter existing.

### When *you* would actually reach for Lambda
Even keeping the main backend on a normal server, these pieces are great Lambda candidates *later*:
- **Image/thumbnail processing** when an upload hits S3.
- **Sending emails** (the real sender you'll add for verification) as an async, event-triggered function.
- **Scheduled cleanup** that doesn't need the main app running.
- **The LLM microservice** proxy, if it's stateless request/response.

And you'd move the *whole* app toward serverless only if you re-architected away from in-memory state
and persistent connections (e.g. matches in Redis, WebSockets via a managed service) **and** had
traffic spiky enough that scale-to-zero economics beat a cheap always-on instance. That's a
later-stage optimization, not a launch concern.

**Rule of thumb:** *stateless + event-driven + bursty → serverless is great. Persistent
connections + in-memory state + always-on workers → use a long-running server.* You're firmly in
the second category today.

---

## 8. Launch-day runbook (in order)

1. **Provision data store:** create the managed Postgres; copy its connection string. (No MongoDB — chat is ephemeral; see [`mongodb.md`](./mongodb.md).)
2. **Provision uploads bucket:** S3/R2 bucket + credentials (or confirm a persistent volume).
3. **Deploy the backend container** to Railway/Render/VPS with all secrets as env vars and
   `ASPNETCORE_ENVIRONMENT=Production`. On first boot it migrates + seeds (admin account, reference data).
4. **Build & deploy the frontend** (`npm run build`) to Cloudflare Pages; set `VITE_API_URL=https://api.oxygenquiz.com/api`.
5. **Buy the domain** at Cloudflare Registrar (or transfer DNS to Cloudflare).
6. **Point DNS:** `www`/root → frontend, `api` → backend, both proxied (orange cloud).
7. **Set production CORS + AllowedHosts** to the real domain; redeploy backend if needed.
8. **Turn on Cloudflare protection:** Bot Fight Mode + rate-limit rules on auth/guest endpoints (§6).
9. **Smoke-test over real HTTPS:**
   - [ ] Signup → email/login flow.
   - [ ] Guest play (one free quiz, then the cookie gate — see [`guest-play.md`](./guest-play.md)).
   - [ ] A full **multiplayer match** with two browsers (verifies WebSockets through Cloudflare).
   - [ ] File upload persists across a redeploy.
   - [ ] Admin dashboard reachable; Hangfire dashboard **not** reachable in prod.
10. **Change the seeded admin password.**

---

## 9. After launch — the scaling path (when single-instance hurts)

You'll know it's time when: deploy-time match drops become painful, or one instance can't handle
the traffic, or you want zero-downtime deploys. The order to tackle it:

1. **Move uploads to object storage** (if not already) — removes the local-disk dependency.
2. **Add a SignalR Redis backplane** + a **shared match store** (Redis) so multiple instances see
   the same matches. This is the big one that unlocks horizontal scaling.
3. **Externalize Hangfire** (it already uses Postgres storage) and ensure only one scheduler runs.
4. **Move migrations out of startup** into a one-off deploy step (avoids the multi-instance race
   noted in [`known-issues.md`](./known-issues.md)).
5. *Then* you can run 2+ instances behind the load balancer for rolling, zero-downtime deploys.

Until you hit that wall, a single well-monitored instance behind Cloudflare is a perfectly
legitimate way to run this app.

---

## Related

- [`rate-limiting.md`](./rate-limiting.md) — the implemented app-level limiter referenced in §6.
- [`known-issues.md`](./known-issues.md) — the launch-blocker checklist this doc gates on.
- [`authentication.md`](./authentication.md) — JWT, refresh cookie, the `SameSite` details referenced in §4.
- [`guest-play.md`](./guest-play.md) — the guest flow to smoke-test in §8.
- [`play-auth-and-identity.md`](./play-auth-and-identity.md) — why multiplayer is login-gated.
- [`README.md`](./README.md) — local development setup (the dev-side counterpart to this doc).
