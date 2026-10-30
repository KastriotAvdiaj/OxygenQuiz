# 27. The client IP is resolved at Nginx, not in the app

Date: 2026-10-17
Status: Accepted

## Context

The rate limiter partitions anonymous traffic by client IP, and the audit log records it. Behind
Cloudflare → Nginx → Kestrel the socket address is never the visitor, so something has to say who
the visitor is.

The app used to decide that itself: `RateLimitingExtensions.ClientIp` read `CF-Connecting-IP`, then
the first entry of `X-Forwarded-For`, then the socket. Two problems followed.

- **Any caller who could reach the origin directly picked their own bucket.** The VPS accepted 443
  from anywhere, and a fresh `CF-Connecting-IP` per request was a fresh partition — unlimited login
  attempts. The comment in the Nginx config claimed the Cloudflare Origin certificate prevented
  direct access; it doesn't (`curl -k`).
- **Two readers disagreed.** `UseForwardedHeaders` (needed for `https://` URL generation) was also
  rewriting `RemoteIpAddress` from the *last* `X-Forwarded-For` entry — a Cloudflare edge — so the
  audit log recorded Cloudflare's addresses while the limiter used the visitor's.

## Decision

**Nginx is the only thing that interprets client-IP headers.** It trusts `CF-Connecting-IP` only
when the connection comes from Cloudflare's published ranges (`real_ip`, in
`deploy/nginx/cloudflare-real-ip.conf`), overwrites `X-Forwarded-For` with the single resolved
address, and clears `CF-Connecting-IP` on the way to the backend.

**The app reads `Connection.RemoteIpAddress` and nothing else.** `UseForwardedHeaders` applies
Nginx's one-value `X-Forwarded-For`; the limiter, the audit log and anything later read the same
property.

## Consequences

- A direct-to-origin request keeps its real socket address whatever it sends, so the spoofing hole
  is closed in software even before the firewall is locked. The firewall (443 from Cloudflare only)
  is still wanted — it also keeps scanners and floods off the box — but is no longer what the
  rate limiter's correctness rests on.
- **Deploy order matters.** The Nginx change must be live before the backend that relies on it: an
  old Nginx appends to `X-Forwarded-For`, and the new backend would read the last hop — a Cloudflare
  edge — and put many visitors in one bucket. The runbook says so.
- Cloudflare's ranges are now configuration on the VPS. They change rarely and with notice;
  `deploy/nginx/update-cloudflare-ips.sh` regenerates the file and refuses to write a short list.
- Local development and the E2E stack have no Nginx; the socket address is the client there, which
  is correct.
- `KnownProxies`/`KnownNetworks` stay cleared: Docker's NAT presents Nginx from the bridge gateway,
  not loopback. It is safe only because the backend publishes on `127.0.0.1` — exposing that port
  would hand `X-Forwarded-For` to anyone.
