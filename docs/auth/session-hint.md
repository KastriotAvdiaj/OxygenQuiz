# The session hint and the one-round-trip boot

How the app decides, on a fresh page load, who is signed in — and why a first-time visitor no
longer waits for the server before seeing anything.

The decision and the alternatives it beat are in
[ADR 0016](../adr/0016-a-readable-hint-decides-whether-boot-asks-the-server.md). This file is
the present tense. The token scheme it sits on top of is in
[`authentication.md`](authentication.md).

---

## 1. The problem it solves

`AuthLoader` (`Provider.tsx`) wraps the whole app and renders "Signing you in" until
`getUser` (`lib/Auth.tsx`) settles. Nothing — not the header, not the landing page — paints
before that.

`getUser` cannot just look in the browser for the answer, because of two deliberate choices
in the token scheme:

- the **access token** lives only in memory (`lib/token-store.ts`), so every page load starts
  without one;
- the **refresh token** is an **HttpOnly** cookie, so JavaScript cannot see whether it exists.

So the only way to know was to ask the server. Before this change, that took:

| Visitor | Requests before the app painted | Round trips |
|---|---|---|
| Never signed in | `GET /me` → 401, `POST /refresh` → 401 | **2**, both certain to fail |
| Signed in | `GET /me` → 401, `POST /refresh` → 200, `GET /me` (replay) → 200 | **3** |

The 140 ms appearance delay on `PageLoading` hid this on localhost. In production, two or
three round trips to the VPS are well past 140 ms, so a first-time visitor's first sight of
OxygenQuiz was a loading screen — to learn something (they are nobody) that was knowable in
advance.

## 2. The two changes

### Change 1 — boot calls `/refresh` directly

`POST /Authentication/refresh` already answers with `{ token, user }` (the same
`AuthResponseDTO` login returns, built by `BuildAuthResultAsync`, with the same `UserDTO`
`/me` returns — roles and permissions included). Calling `/me` first was a detour: on a page
load it *always* 401s, because there is never an access token yet.

`getUser` now checks the in-memory store first. No token means this is a page load, and it
goes straight to `refreshSession()` (`lib/Api-client.ts`), which stores the new access token
and hands back the user. One round trip instead of three.

`refreshSession` is the same function the 401 interceptor uses, so both share one
single-flight promise. That is load-bearing: refresh tokens **rotate**, so two parallel
refreshes from one tab would present the same token twice and the second would be rejected as
revoked.

### Change 2 — a readable cookie says whether to ask at all

Alongside the HttpOnly `refresh_token`, the backend now sets a second cookie:

```
has_session=1; path=/; secure; samesite=lax; expires=<same as refresh_token>
              [; domain=oxygenquiz.com in production]
```

It is **not** HttpOnly — being readable by `document.cookie` is its entire purpose. It holds
no secret: the value is always the literal `1`. `hasSessionHint()` (`lib/session-hint.ts`)
reads it.

- **Absent** → this browser has no session. `getUser` returns `null` without a request and the
  app paints on the next tick.
- **Present** → there is probably a session. Change 1 takes over: one call to `/refresh`.

### Result

| Visitor | Requests before the app painted | Round trips |
|---|---|---|
| Never signed in / signed out | none | **0** |
| Signed in | `POST /refresh` → 200 | **1** |
| Hint present but session dead (see §4) | `POST /refresh` → 401 | **1** |

## 3. `getUser`, case by case

| In-memory token | Hint | What happens | When this occurs |
|---|---|---|---|
| none | absent | `null`, no request | Page load, signed out |
| none | present | `refreshSession()` → user | Page load, signed in |
| present | (not read) | `GET /me` | A refetch mid-session, e.g. after a profile edit |

Failure handling on the `/refresh` branch: **any HTTP answer** (a 401, a 429 from the auth
rate limit) means "signed out" and resolves to `null` — the visitor sees the app, not an error
screen, just as the old `/me` → interceptor → refresh path behaved. Only **no answer at all**
(API down, offline) throws, and reaches `AuthLoader`'s error state.

The route gates (`createAuthLoader`) call the same `getUser`, so protected routes pick up
both improvements without changes of their own.

## 4. The one rule: the hint may only be wrong in the "present" direction

The hint can disagree with reality in two ways, and they are not equally bad:

- **Hint present, no valid session** (a *false positive*). Costs one `/refresh` that 401s, and
  the visitor lands signed out — which is correct. Cheap and self-evident.
- **Hint absent, valid session** (a *false negative*). The frontend never asks the server, so a
  signed-in user looks signed out — and *nothing will ever correct it*, because the thing that
  would correct it is the request the hint just skipped. They have to log in again.

Everything about how the hint is managed follows from keeping false negatives impossible:

1. **Set together, cleared together.** `SetSessionCookies` / `ClearSessionCookies` in
   `AuthenticationController` write both cookies in one place. Every path that issues a refresh
   token (login, signup, external login, external signup, refresh) goes through
   `SetSessionCookies`, so no path can start a session without the hint.
2. **Same expiry.** Both cookies get the refresh token's `ExpiresAt`, and both are re-issued on
   every rotation, so they lapse together — the sliding 7-day window applies to both.
3. **The frontend never deletes it.** Only the backend clears the hint. A frontend that cleared
   it on a failed refresh would turn the multi-tab race below into a permanent false negative.

### Where the backend does correct a stale hint

`/refresh` called with **no refresh cookie at all** clears the hint. A browser with no refresh
cookie has definitely got no session, so the hint cannot be right; clearing it cannot create a
false negative.

### Why an invalid refresh token leaves the hint alone

It is tempting to also clear the hint when a refresh token is *present but invalid*. That is
deliberately not done, because of tabs:

1. Two tabs reload at the same moment. Both send the same refresh token.
2. Tab A wins: its token is rotated, and its response sets a fresh `refresh_token` **and**
   `has_session`.
3. Tab B loses: it presented the token A just revoked, so it gets a 401.

If B's 401 cleared the hint, it would delete the hint A just set — while A's new refresh
cookie is perfectly valid. That is exactly the false negative §4 forbids. (Clearing the refresh
cookie there would be worse still: it would sign the user out of *both* tabs.) So a present-but-
invalid token answers 401 and changes no cookies. Tab B shows signed out until its next reload,
which is the same one-off behaviour documented in `authentication.md` → "Recommended
improvements" #5.

The price is that a hint can outlive its session when the session is killed server-side — a
revoked token, an account deletion, a wiped dev database. Each page load in that browser then
costs one failed `/refresh` until the next login, logout, or the hint's own 7-day expiry. That is
a false positive, which §4 says is the cheap direction.

## 5. Cookie attributes, and why

| Attribute | Value | Why |
|---|---|---|
| Name | `has_session` | Mirrored in `session-hint.ts` (`SESSION_HINT_COOKIE`) and the controller (`SessionHintCookieName`). Change both or neither. |
| Value | `1` | Presence is the whole message. No user id, no expiry, nothing to parse or trust. |
| `HttpOnly` | **off** | JavaScript must read it. |
| `Secure` | on | Same as the refresh cookie. `localhost` counts as secure in Chrome and Firefox, so plain-HTTP Docker dev still works. |
| `SameSite` | `Lax` | The server never reads it, so it has no reason to travel cross-site. |
| `Path` | `/` | The SPA's pages live at every path. (The refresh cookie is scoped to `/api/Authentication` — it is for the server; this one is for the page.) |
| `Domain` | `Auth:SessionHintCookieDomain` | See below. |
| `Expires` | the refresh token's `ExpiresAt` | So the two lapse together (§4.2). |

### The Domain setting

In production the API is `api.oxygenquiz.com` and the SPA is `oxygenquiz.com` (and `www.`).
A cookie set by the API with no `Domain` is **host-only** — it belongs to `api.oxygenquiz.com`,
and `document.cookie` on `oxygenquiz.com` never sees it. `Domain=oxygenquiz.com` widens it to
the whole site.

| Environment | `Auth:SessionHintCookieDomain` | Where it's set |
|---|---|---|
| Development (`dotnet run` + Vite) | empty → host-only | `appsettings.json` |
| Docker (`docker compose up`) | empty → host-only | `appsettings.json` |
| Production | `oxygenquiz.com` | `appsettings.Production.json` |

Host-only works in development because the API and the SPA are both on `localhost`, and cookies
are not isolated by port: a cookie set by `localhost:7153` (or `:5000` in Docker) is readable on
`localhost:5173`.

If this setting is wrong in production, the hint is set but invisible to the SPA, every
visitor looks signed out, and signed-in users lose their session on every reload. That is the
false negative of §4, caused by configuration — so it is the first thing to check if "I keep
getting logged out" appears after a deploy.

**The `*.workers.dev` address** is not under `oxygenquiz.com`, so the hint is never visible
there and the app always boots signed out on it. That address is only a publish target
(`wrangler.jsonc`), and third-party-cookie blocking already made sessions unreliable there.

## 6. Rolling it out

**Anyone already signed in when this deploys will look signed out once.** They hold a valid
`refresh_token` but, having never received a response from the new backend, no hint — a false
negative. Logging in once sets both cookies and the problem is gone for good. With a small user base
that was judged cheaper than a transition shim (ADR 0016, "Alternatives").

Deploy the backend first, or together with the frontend. A new frontend against an old backend
never sees a hint, so everyone looks signed out until the backend catches up.

## 7. How to check it

In DevTools on a fresh load:

1. **Signed out:** Network tab shows **no** `Authentication/*` request during boot. Application
   → Cookies shows no `has_session`.
2. **Log in:** cookies now show `refresh_token` (HttpOnly ✓, path `/api/Authentication`) *and*
   `has_session=1` (HttpOnly ✗, path `/`), with the same expiry. In production, `has_session`
   shows domain `.oxygenquiz.com`.
3. **Reload:** exactly one `POST Authentication/refresh` → 200, no `Authentication/me`. You are
   signed in.
4. **Log out:** both cookies are gone. Reload → back to case 1.
5. **Stale hint:** sign in, then delete only `refresh_token` in DevTools and reload. One
   `/refresh` → 401, the app loads signed out, and the response clears `has_session`.

Automated coverage:

- `src/lib/__tests__/get-user.test.ts` — which endpoint `getUser` calls in each case, and which
  failures mean "signed out" versus "broken".
- `src/lib/__tests__/session-hint.test.ts` — reading the cookie.
- `OxygenBackend/QuizAPI.Tests/Auth/SessionCookieTests.cs` — the `Set-Cookie` headers: the
  pairing, the shared expiry, the Domain setting, logout clearing both with matching
  attributes, and the stale-hint correction.

## 8. Files

| Concern | File |
|---|---|
| Setting and clearing both cookies, the Domain setting | `OxygenBackend/QuizAPI/Controllers/Authentication/Authentication.cs` (`SetSessionCookies`, `ClearSessionCookies`, `SessionHintCookieOptions`) |
| Production Domain | `OxygenBackend/QuizAPI/appsettings.Production.json` |
| Reading the hint | `src/lib/session-hint.ts` |
| Single-flight `/refresh` shared by boot and the 401 interceptor | `src/lib/Api-client.ts` (`refreshSession`) |
| The boot decision | `src/lib/Auth.tsx` (`getUser`) |
| The loading screen it shortens | `src/Provider.tsx` (`AuthLoader renderLoading`) |
