# Rate Limiting

> **Status: implemented (2026-06-22).** App-level rate limiting using the built-in .NET 8 limiter.
> This is **layer 2** of the abuse-protection strategy — Cloudflare is layer 1 and does the heavy
> lifting against real DDoS. See [`deployment.md` §6](./deployment.md) for how the layers fit together.

## Why this exists

A single backend instance (see [`deployment.md` §1](./deployment.md)) can't absorb a flood by scaling
out, so we protect it in depth:

1. **Cloudflare (edge)** — absorbs volumetric DDoS and applies coarse per-IP rules before traffic ever
   reaches us. *This is the real DDoS defense.*
2. **App-level limiter (this doc)** — catches what slips past the edge and protects specific
   high-risk endpoints (credential brute-force, email spam, guest-session churn). Defense in depth.
3. **Reverse proxy** (`nginx limit_req`) — optional, only on the VPS deployment.

App-level limiting is **not** a substitute for Cloudflare; if the origin is exposed directly, a large
attack still overwhelms the box. Keep the origin firewalled to Cloudflare's IP ranges in production.

## What's configured

All of it lives in [`Middleware/RateLimitingExtensions.cs`](../OxygenBackend/QuizAPI/Middleware/RateLimitingExtensions.cs),
wired up in `Program.cs` (`AddOxygenRateLimiting()` + `app.UseRateLimiter()`).

| Scope | Limit | Window | Applies to |
|---|---|---|---|
| **Global** (safety net) | 100 requests | 10 s sliding, per IP | Everything **except** the SignalR hubs |
| **`auth`** policy | 10 requests | 1 min fixed, per IP | `login`, `signup`, `refresh`, `verify-email`, `resend-verification` |
| **`guest`** policy | 20 requests | 1 min fixed, per IP | `POST /api/guest-quiz-sessions` (guest session creation) |

- The **global** limiter is deliberately generous — normal play (loading questions, submitting
  answers) must never trip it. It only catches a single source hammering the API.
- The **SignalR hubs** (`/quizHub`, `/notificationHub`) are exempt: rate-limiting a long-lived
  WebSocket connection is meaningless and would break multiplayer.
- Limits **reject immediately** (`QueueLimit = 0`) rather than queueing requests.

### Endpoint policies

Policies are attached per-action with `[EnableRateLimiting("...")]` using the name constants on
`RateLimitingExtensions` (no magic strings):

```csharp
[HttpPost("login")]
[EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
public Task<IActionResult> Login(...) { ... }
```

`logout` and `me` are intentionally **not** rate-limited beyond the global cap (`me` is polled by the
SPA; throttling it would break the UI).

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

## Trusting the client IP

Limits are partitioned by the **real client IP**, resolved in this order (`ClientIp` in the extension):

1. `CF-Connecting-IP` — Cloudflare's header carrying the true visitor IP.
2. first hop of `X-Forwarded-For` — generic proxy fallback.
3. socket `RemoteIpAddress` — direct connection (local dev).

> ⚠️ **Security note.** These headers are only trustworthy when traffic is *forced* through the proxy.
> If the origin is reachable directly, a caller can spoof `CF-Connecting-IP` to dodge per-IP limits or
> frame another IP. In production, **lock the origin's firewall to Cloudflare's published IP ranges**
> so the only path in is through the edge. Without that, treat these limits as best-effort.

This is also why we read the header manually instead of trusting `X-Forwarded-For` globally via
`ForwardedHeaders` middleware — we want one explicit, auditable place that knows about Cloudflare.

## Tuning

The numbers above are sensible starting points, not law. Adjust in `RateLimitingExtensions.cs`:

- **Too strict in practice?** Raise `PermitLimit` (especially the global one) or widen the window.
- **Under attack on a specific route?** Add a new named policy and attach it with `[EnableRateLimiting]`.
- **Long-running endpoints** (e.g. report exports): consider a concurrency limiter instead of a rate
  limiter so one user can't tie up the single instance with parallel heavy requests.
- Watch for `429` spikes in logs after launch and retune; pair with Cloudflare Analytics to see what
  the edge already absorbed.

## Testing it

- **Locally:** `curl` a limited endpoint in a loop and confirm the 11th call within a minute returns 429:
  ```bash
  for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://localhost:7153/api/Authentication/login \
    -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"nope"}'; done
  ```
  (Local requests share one socket IP, so they all land in the same partition — expect `...200/400 × 10` then `429`.)
- **Behind Cloudflare:** verify partitioning works per real user by confirming two different clients
  aren't throttled together (i.e. `CF-Connecting-IP` is being honored).

## Related

- [`deployment.md`](./deployment.md) — §6 (the three-layer strategy), §1 (single-instance constraint).
- [`known-issues.md`](./known-issues.md) — other pre-launch hardening items.
- [`authentication.md`](./authentication.md) — the auth endpoints these policies protect.
