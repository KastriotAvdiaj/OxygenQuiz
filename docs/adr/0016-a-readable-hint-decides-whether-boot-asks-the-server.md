# 16. A readable hint decides whether boot asks the server

Date: 2026-09-22
Status: Accepted

## Context

`AuthLoader` wraps the whole app and shows "Signing you in" until `getUser` settles. The token
scheme (`docs/auth/authentication.md`) keeps the access token in memory only and the refresh
token in an HttpOnly cookie — both on purpose, to keep tokens out of reach of an XSS payload. The
side effect is that on a page load the browser holds nothing JavaScript can inspect, so the only
way to learn who is signed in was to ask:

- a visitor who had never signed in paid **two** round trips (`/me` → 401, `/refresh` → 401),
  both guaranteed to fail, before seeing the landing page;
- a signed-in visitor paid **three** (`/me` → 401, `/refresh` → 200, `/me` again).

In production that is comfortably longer than `PageLoading`'s 140 ms delay, so the first thing a
new visitor ever saw was a loading screen.

## Decision

**1. Boot resumes a session with `/refresh` alone.** It already returns `{ token, user }`. With no
access token in memory, `getUser` calls it directly instead of calling `/me` and waiting for it
to fail. The call goes through the same single-flight `refreshSession()` as the 401 interceptor,
because refresh tokens rotate and must never be presented twice in parallel.

**2. A non-secret, readable cookie — `has_session=1` — decides whether to ask at all.** The backend
sets it beside the refresh cookie on every path that issues one, with the same expiry, and
clears both on logout. When it is absent, `getUser` answers `null` without a request.

The hint must only ever be wrong in the *present* direction. A false positive costs one failed
`/refresh`; a false negative makes a signed-in user look signed out with nothing to correct it,
because the request that would correct it is the one the hint skipped. Hence: set and cleared in
one place, one expiry, never deleted by the frontend, and not cleared on an invalid refresh token
(that 401 can be the loser of a two-tab rotation race, and clearing there would wipe the winner's
fresh hint). Full reasoning: `docs/auth/session-hint.md` §4.

## Alternatives

- **Render the app without waiting for `AuthLoader`.** Fixes the wait for everyone, including
  signed-in users, but ~30 components read `useUser()` and some assume a settled answer; header
  and landing CTAs would flip from "Sign up" to the user's menu after paint. Still open as a
  follow-up — it composes with this decision rather than replacing it.
- **Persist the user (not the token) in `localStorage` and render optimistically.** Instant for
  returning users, but it shows a stale identity and stale permissions until the server
  disagrees, and gives two sources of truth for "who am I".
- **Move the access token back into readable storage.** Reverses the XSS reasoning the token
  scheme rests on, to save one round trip. Rejected outright.
- **A transition shim for sessions that predate the hint** (e.g. try `/refresh` once when no hint
  has ever been seen). Avoids one forced re-login per existing user at deploy time, at the cost
  of permanent code for a one-time event. Not worth it at the current user count.

## Consequences

- **Signed-out visitors boot with zero auth requests; signed-in visitors with one.**
- **A new cookie is readable by JavaScript.** It carries no secret and grants nothing — forging
  it buys a 401 — so it adds no XSS exposure. The refresh cookie stays HttpOnly and remains the
  only credential.
- **Production depends on `Auth:SessionHintCookieDomain`.** The API and SPA are different hosts,
  so the hint must be widened to `oxygenquiz.com`. Misconfigured, the hint is invisible to the SPA
  and every reload signs everyone out — the first thing to check if that symptom appears.
- **A session killed server-side leaves its hint behind** until the next login, logout or the
  hint's own expiry, costing one failed `/refresh` per page load in that browser. Accepted: it is
  the cheap direction.
- **Existing sessions look signed out once at deploy** (valid refresh cookie, no hint yet). One
  login fixes it permanently. Deploy the backend no later than the frontend.
- **The `*.workers.dev` address always boots signed out** — it is outside the hint's domain. It was
  never a supported way to use the app.
