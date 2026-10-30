# Rate Limiting

> **Status: implemented (2026-06-22).** App-level rate limiting using the built-in .NET 8 limiter.
> This is **layer 2** of the abuse-protection strategy — Cloudflare is layer 1 and does the heavy
> lifting against real DDoS. See [`deployment.md` §6](../deployment/deployment.md) for how the layers fit together.

## Why this exists

A single backend instance (see [`deployment.md` §1](../deployment/deployment.md)) can't absorb a flood by scaling
out, so we protect it in depth:

1. **Cloudflare (edge)** — absorbs volumetric DDoS and applies coarse per-IP rules before traffic ever
   reaches us. *This is the real DDoS defense.*
2. **App-level limiter (this doc)** — catches what slips past the edge and protects specific
   high-risk endpoints (credential brute-force, email spam, guest-session churn). Defense in depth.
3. **Reverse proxy** (`nginx limit_req`) — optional, only on the VPS deployment.

App-level limiting is **not** a substitute for Cloudflare; if the origin is exposed directly, a large
attack still overwhelms the box. Keep the origin firewalled to Cloudflare's IP ranges in production.

## What's configured

All of it lives in [`Middleware/RateLimitingExtensions.cs`](../../OxygenBackend/QuizAPI/Middleware/RateLimitingExtensions.cs),
wired up in `Program.cs` (`AddOxygenRateLimiting(builder.Configuration)` + `app.UseRateLimiter()`).
Switched by `RateLimiting:Enabled` (default on; off in Development — see "In development").

| Scope | Limit | Window | Applies to |
|---|---|---|---|
| **Global**, signed in | 100 requests | 10 s sliding, **per user** | Everything except hub connection traffic |
| **Global**, anonymous | 300 requests | 10 s sliding, per IP | Everything except hub connection traffic |
| **`auth`** policy | 20 requests | 1 min sliding, per IP | `login`, `signup`, `external-login`/`-signup`, `validate-invite-code`, `verify-email`, `resend-verification`, password reset |
| **`guest`** policy | 20 requests | 1 min sliding, per IP | `POST /api/guest-quiz-sessions` (guest session creation) |
| **`ai`** policy | 6 requests | 1 min sliding, **per user** | `POST /api/quiz/ai-generate` only |
| **`media-search`** policy | 120 requests | 1 hour fixed, **per user** | `GET /api/media/stock/search` — searching Wikimedia Commons and Pexels. Results are cached an hour, but Pexels allows 200 requests an hour for the whole site, so one account mustn't spend it ([`../media/media-pipeline.md`](../media/media-pipeline.md) §7) |
| **`media-upload`** policy | 30 requests | 1 hour fixed, **per user** | `POST /api/media` and `POST /api/media/stock/import` (an import stores a file too). The media quota counts saves, not uploads, so this is what stops a script uploading thousands of files nobody saves ([`../media/media-pipeline.md`](../media/media-pipeline.md) §5) |

- The **global** limiter is deliberately generous — normal play (loading questions, submitting
  answers) must never trip it. It only catches a single source hammering the API.
- **Signed in is counted per user, anonymous per IP** (2026-10-17). A school puts a whole class
  behind one public IP (NAT); counted per IP, 30 students opening a quiz together — each page load is
  several requests — overran 100 in a few seconds. Anonymous traffic keeps the IP, with more room
  (300) because that IP may also be a whole class browsing signed out or playing as guests.
- **`refresh` is not in `auth`** (2026-10-17). Its token is 256 random bits, so there is nothing to
  guess, and the SPA calls it by itself — in the login bucket, a user's background refreshes ate
  their own login attempts. The global limit still covers it.
- **Every SignalR hub's connection traffic is exempt** — recognised by the `HubMetadata` `MapHub`
  puts on its endpoints, not by a path list. The list this replaced missed `/hostedGameHub`.
  **`negotiate` is still counted**: one request per new connection costs a real client nothing, and
  it is the only cap on how fast connections can be opened — which is what bounds Screen-code
  guessing, since a Display gets a fixed number of guesses *per connection* (ADR 0024).
- **Sliding windows everywhere.** A fixed minute allowed the limit at 0:59 and the limit again at
  1:00 — double, at every boundary.
- Limits **reject immediately** (`QueueLimit = 0`) rather than queueing requests.
- The **`ai`** policy is the one exception to per-IP partitioning — see
  ["Partitioning by user"](#partitioning-by-user) below. It is also the only limit that guards
  something that costs real money, though the hard ceiling there is the per-user daily quota in
  [`ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md) §4, not this window.
  Deliberately attached to `ai-generate` **alone**: the sibling `ai-prompt` and `ai-quota` calls
  are free, run on page load and on every copy, and are what we point users at when generation
  fails — throttling them with the same budget would throttle the fallback too.

### Endpoint policies

Policies are attached per-action with `[EnableRateLimiting("...")]` using the name constants on
`RateLimitingExtensions` (no magic strings):

```csharp
[HttpPost("login")]
[EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
public Task<IActionResult> Login(...) { ... }
```

`logout`, `me` and `refresh` are intentionally **not** rate-limited beyond the global cap (`me` and
`refresh` are called by the SPA on its own; throttling them would break the UI).

**Per-account brute force is not covered here.** The limiter can't see the email in a login body,
so `auth` bounds guesses per IP, not per account — someone with many IPs can still spread guesses
across one account. Recorded in `known-issues.md`; the Cloudflare rate-limiting rule
(`production-topology.md`, "Locking the edge") narrows it.

## Rejection behavior

When a limit is exceeded the client gets:
- **HTTP 429 Too Many Requests**
- a **`Retry-After`** header (seconds) when the limiter can supply it
- a JSON body matching the app's error shape:
  ```json
  { "message": "Too many requests. Please slow down and try again in a moment.", "isCustomMessage": true }
  ```

The frontend's Axios error handling already understands `isCustomMessage`, so a 429 surfaces as a
clean user-facing notification rather than a generic error.

## Partitioning by user

The **`ai`** policy and the **global** limiter partition on the authenticated user id
(`user:<guid>`), falling back to `ip:<addr>` for anonymous callers. `auth` and `guest` partition on
IP.

**Why.** A school, library or office sits behind one public address (NAT), so thirty laptops look
like a single client and share one bucket. For AI generation — plausibly most used in exactly
those places — that means the seventh person to press the button in a minute is told to slow down
for something they didn't do.

**Why it's safe.** The id comes from a signed token that authentication has already validated, so a
caller can't mint fresh partitions by lying — a forged token is no token, and lands on the IP. On an anonymous endpoint the IP is
the only key that can't be forged, which is why **`auth` and `guest` must stay on IP** — moving
them would hand an attacker unlimited login attempts for the price of a new anonymous identity.

Keys are prefixed (`user:` / `ip:`) so a user id can never collide with an IP string. The policy
reads the principal after `UseAuthentication`, which the middleware ordering in `Program.cs`
already guarantees.

## Trusting the client IP

**The app reads `Connection.RemoteIpAddress` and no header** (`ClientIp`). Nginx is what makes that
the visitor's address — [ADR 0027](../adr/0027-the-client-ip-is-resolved-at-nginx.md):

1. Nginx trusts `CF-Connecting-IP` only from Cloudflare's published ranges
   (`deploy/nginx/cloudflare-real-ip.conf`, `real_ip`). From anyone else it's ignored and the socket
   address stands.
2. It overwrites `X-Forwarded-For` with that one address and clears `CF-Connecting-IP`.
3. `UseForwardedHeaders` in `Program.cs` applies it to `RemoteIpAddress`, which the limiter and the
   audit log both read.

So a request sent straight to the origin, with any headers it likes, is counted for its real socket
address. This used to be the other way round — the app read `CF-Connecting-IP` itself, and a direct
caller could choose a fresh bucket per request. The firewall restricting 443 to Cloudflare is still
wanted, but the limiter's correctness no longer rests on it.

> ⚠️ **Deploy Nginx first.** An old Nginx *appends* to `X-Forwarded-For`; the backend reads the last
> entry, a Cloudflare edge, and many visitors share one bucket. Steps in
> [`production-topology.md`](../deployment/production-topology.md), "Locking the edge".

## In development

**All of it is off in Development** (2026-09-30): `appsettings.Development.json` sets
`"RateLimiting": { "Enabled": false }`. Local work — hot reload, refreshing a page twenty times,
clicking through the showcase flows — kept tripping the `auth` and global limits, and every local
request shares one IP, so they all land in one bucket. With the switch off there is no global cap
and every named policy is a no-op (the policies still exist, because `[EnableRateLimiting]` asks for
them by name and an unknown name throws).

The key **defaults to on** when missing, so Production (and any environment that doesn't say
otherwise) keeps every limit. To test the limits locally, set it to `true` — for one run,
`RateLimiting__Enabled=true dotnet run`, or in user-secrets.

## Tuning

The numbers above are sensible starting points, not law. Adjust in `RateLimitingExtensions.cs`:

- **Too strict in practice?** Raise `PermitLimit` (especially the global one) or widen the window.
- **Under attack on a specific route?** Add a new named policy and attach it with `[EnableRateLimiting]`.
- **Long-running endpoints** (e.g. report exports): consider a concurrency limiter instead of a rate
  limiter so one user can't tie up the single instance with parallel heavy requests.
- Watch for `429` spikes in logs after launch and retune; pair with Cloudflare Analytics to see what
  the edge already absorbed.

## Testing it

- **Locally:** turn the limits on first (see "In development"), then `curl` a limited endpoint in a loop and confirm the 11th call within a minute returns 429:
  ```bash
  for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://localhost:7153/api/Authentication/login \
    -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"nope"}'; done
  ```
  (Local requests share one socket IP, so they all land in the same partition — expect `...200/400 × 10` then `429`.)
- **Behind Cloudflare:** after deploying, check the audit log for a recent action — it should show
  your own public IP, not a Cloudflare address (`104.x`, `172.64–71.x`, `162.158/159.x`, …). That is
  the end-to-end proof that Nginx resolved it and the app applied it.
- **Unit tests:** `QuizAPI.Tests/Security/RateLimitPartitionTests.cs` pins the partition — per user
  when signed in, per IP otherwise, headers ignored, hubs exempt except `negotiate`.

## Related

- [`deployment.md`](../deployment/deployment.md) — §6 (the three-layer strategy), §1 (single-instance constraint).
- [`known-issues.md`](../deployment/known-issues.md) — other pre-launch hardening items.
- [`authentication.md`](../auth/authentication.md) — the auth endpoints these policies protect.
