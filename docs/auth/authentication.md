# Authentication

## Overview

OxygenQuiz uses a **two-token** scheme:

| Token | What it is | Lifetime | Where it lives | Who reads it |
|-------|-----------|----------|----------------|--------------|
| **Access token** | A signed JWT (HS256) carrying the user id, email, username and role claims. | **1 hour** (`TokenService.GenerateToken`) | **In memory only** — a module variable in `src/lib/token-store.ts`. Never written to a cookie or localStorage. Sent on every API call as `Authorization: Bearer …`. | The API, on every `[Authorize]` request. |
| **Refresh token** | A 256-bit random string. Only its **SHA-256 hash** is stored in the DB (`RefreshTokens` table). | **7 days** (`TokenService.RefreshTokenDays`) | An **HttpOnly, Secure** cookie `refresh_token`, scoped to path `/api/Authentication`. | Only the `/Authentication/refresh` and `/logout` endpoints. |

The split is deliberate: the access token is short-lived and kept only in memory so an XSS bug has no persisted token to steal; the refresh token is long-lived but never exposed to JavaScript and can be revoked server-side.

## The flow

### Login / signup
1. `POST /api/Authentication/login` (or `/signup`) → `AuthenticationService.LoginAsync`.
2. Password verified with BCrypt. On success `BuildAuthResultAsync` mints an access token **and** a refresh token (storing only its hash).
3. The controller returns `{ token, user }` in the body and sets the `refresh_token` HttpOnly cookie.
4. The frontend (`Auth.tsx` → `loginFn`) saves `token` into the in-memory store (`setAccessToken`) and caches the `user`.

### An authenticated request
1. `authRequestInterceptor` (in `Api-client.ts`) reads the token from the in-memory store (`getAccessToken`) and attaches `Authorization: Bearer …` to every request.
2. The API validates the JWT (issuer, audience, lifetime, signature). Valid → handled; expired/invalid → `401`.

### Silent refresh on 401 (the important part)
When any request returns `401`, the response interceptor in `Api-client.ts`:
1. Calls `POST /Authentication/refresh` **once** — the browser automatically attaches the HttpOnly `refresh_token` cookie.
2. `RefreshAsync` looks up the token by hash, confirms it's **active** (not revoked, not expired), then **rotates**: it revokes the presented token and issues a brand-new access **and** refresh token.
3. The new access token is stored **in memory** and the original failed request is **replayed** transparently.
4. A single-flight `refreshPromise` means many concurrent 401s share one refresh call.
5. If refresh fails (no/expired/revoked refresh token) → the access cookie is cleared and the error propagates, sending the user to `/login`.

### Logout
`POST /Authentication/logout` revokes the stored refresh token (`RevokedAt = now`) and clears the cookie; the frontend removes `quiz_app_token` and redirects home.

### Route protection
`createAuthLoader` (`Auth.tsx`) runs before protected routes: it fetches `/me`, redirects to `/login?redirectTo=…` if unauthenticated, and enforces role/permission gates. **SuperAdmin bypasses all gates.** Helpers: `adminAuthLoader`, `superAdminAuthLoader`, `permissionAuthLoader`.

## Main functions / files

| Concern | File |
|---------|------|
| Endpoints, cookie set/clear | `Controllers/Authentication/Authentication.cs` |
| Login/signup/refresh/logout logic, rotation | `Services/AuthenticationService/AuthenticationService.cs` |
| JWT minting, refresh-token generation + hashing | `Services/AuthenticationService/TokenService.cs` |
| Active-token lookup, revoke-all | `Repositories/RefreshTokenRepository.cs` |
| JWT validation, CORS, scheme setup | `Program.cs` |
| Token attach + silent-refresh interceptor | `src/lib/Api-client.ts` |
| In-memory access-token store | `src/lib/token-store.ts` |
| Frontend auth config, route loaders/gates | `src/lib/Auth.tsx` |

## Why you stay logged in days later (this is intended)

The access token is held only in memory, so it's gone on every reload — but the **refresh token lasts 7 days, lives in an HttpOnly cookie, and is rotated on every use**. When you reopen the app:

- On reload the in-memory access token is null, so the first API call 401s; the interceptor silently refreshes using the 7-day `refresh_token` cookie, repopulates the in-memory token, and replays the request — *and a new 7-day refresh token is issued.*
- You stay signed in without the token ever being persisted in JS-readable storage.

Because rotation resets the 7-day window each time, **visiting at least once a week keeps you logged in indefinitely**. This is a deliberate "remember me" / sliding-session design, not a bug. You're only forced to log in again if more than 7 days pass with no activity, or after an explicit logout.

To change the behavior: shorten `RefreshTokenDays` in `TokenService`, or to make sessions non-sliding, keep the original `ExpiresAt` when rotating instead of generating a fresh 7-day expiry.

## How to test the refresh-token implementation

### A. Quick manual test (browser DevTools)
1. Log in. In DevTools → Application → Cookies, confirm **only** `refresh_token` exists (HttpOnly ✓, Secure ✓, Path `/api/Authentication`). There should be **no `quiz_app_token` cookie** — the access token is in memory now.
2. Reload the page (this clears the in-memory access token, simulating an expired one).
3. Watch the Network tab on load: the first authenticated call (e.g. `Authentication/me`) → `401`, then `Authentication/refresh` → `200`, then the call replayed → `200`. You stay logged in.
4. Confirm rotation: note the `refresh_token` value before step 2; after refresh it should be **different**.

### B. Rotation / reuse (DB-level)
1. After a refresh, query the `RefreshTokens` table: the previous row should have `RevokedAt` set, and a new active row should exist.
2. Replay an **old** refresh token (e.g. re-send a captured `refresh_token` cookie to `/refresh`). Expected: `401` — `GetActiveByHashAsync` won't return a revoked token.

### C. Expiry
1. Temporarily set `RefreshTokenDays = 0` (or backdate `ExpiresAt` on the DB row), then call `/refresh`. Expected: `401 "Invalid or expired refresh token."`

### D. Logout revocation
1. Log in, then `POST /Authentication/logout`. Confirm the DB row's `RevokedAt` is set and the cookie is cleared. A subsequent `/refresh` should `401`.

### E. Automated (suggested)
Add integration tests against the auth endpoints with `WebApplicationFactory`: login→refresh→replay happy path; reuse of a rotated token returns 401; logout then refresh returns 401. Use a respawned/in-memory Postgres so token rows are real.

## Planned work (designed, not yet built)

- **Email verification** — signups are currently unverified (only format + uniqueness are
  checked). Design for a double opt-in confirmation flow: [`email-verification.md`](email-verification.md).
- **Login required to play + account-based lobby identity** — ✅ implemented (2026-06-20):
  multiplayer routes are auth-gated, the lobby identity is the authenticated account, and the
  `QuizHub` is `[Authorize]`'d with the username taken from `Context.User`. See
  [`play-auth-and-identity.md`](play-auth-and-identity.md).

## Robustness — current strengths

- Refresh tokens are **hashed at rest** (a DB leak can't be replayed) and **rotated** on every refresh.
- Refresh token is **HttpOnly + Secure** and **path-scoped**, so it isn't sent on normal API calls or readable by JS.
- Access token is **kept in memory only** (`token-store.ts`), so it's never sittable in a cookie/localStorage for an XSS payload to scrape.
- JWT validation enforces issuer, audience, lifetime and signature; `RequireHttpsMetadata` is on outside Development.
- Passwords hashed with BCrypt; failed logins are audited.

## Recommended improvements

1. **Move the JWT signing key out of source control — done.** `Jwt:Key` (and the DB/Mongo connection strings) are no longer committed: `appsettings.json` holds only non-secret config. Dev reads the key from **.NET user-secrets**; prod reads it from the **`Jwt__Key` environment variable** (see `appsettings.example.json` and the README "Backend" config section). The previously-committed key has been **rotated**, so the value still in git history can no longer sign valid tokens. The app **fails fast at startup** if `Jwt:Key` is missing.
2. **Refresh-token reuse detection.** Today, replaying a rotated token just 401s. Detect it instead — if a token that's already `Revoked` is presented, treat it as theft and revoke the user's whole token family (`RevokeAllForUserAsync` already exists but is unused).
3. **Expose "log out everywhere."** Wire `RevokeAllForUserAsync` to an endpoint so users (or admins) can kill all sessions; also call it on password change.
4. **Clean up stale tokens.** Add a Hangfire recurring job (Hangfire is already configured) to delete expired/revoked `RefreshTokens` rows.
5. **Access-token storage — done.** The access token now lives only in memory (`token-store.ts`), not in a JS-readable cookie. This shrinks the XSS blast radius to a single tab's runtime memory. Note: in-memory storage is per-tab, so each tab does its own silent refresh on load — with token rotation, two tabs reloading within the same instant can race (the loser gets a one-off 401 and re-refreshes). The full fix is refresh-token reuse handling / a short rotation grace window (see #2). XSS is still the real threat surface, so keep a strict CSP and input sanitization regardless.
6. **Tighten clock skew.** `ClockSkew` is unset (defaults to 5 min), so a 1-hour token is honored for ~65 min. Set it to ~30s if you want lifetimes to be exact.
7. **Persist `AssignedByUserId` / device info** on refresh tokens to make the audit trail and session management richer (the column exists on `UserRole`; consider similar on sessions).
