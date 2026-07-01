# Playing requires login + account-based lobby identity — design

> **Status: fully implemented — layers A, B, and C (2026-06-20).**
> Two linked changes:
> 1. You must be **logged in** to play any quiz (single-player *and* multiplayer), including
>    when arriving via a multiplayer invite link — log in instead of typing a username.
> 2. The multiplayer lobby uses your **account username** as your identity (so the host's
>    name is their real username, not free-typed text).
>
> Both share one root cause, so they're designed together.

> **Concrete root cause of the "host name isn't my username" bug:** the create flow from the
> multiplayer menu (`components/create-lobby-dialog.tsx`) took the username from `sessionStorage`
> or, failing that, generated a **random `Player1234`**. That random name became the host's
> identity. Layer B replaces every such source with the logged-in `user.username`.

## Current state

### Route gating (`src/routes/Router.tsx`)

| Route | Component | Loader | Gated? |
|-------|-----------|--------|--------|
| `/choose-mode`, `/multiplayer-menu` | menus | — | public (fine — just browsing) |
| `/choose-quiz` | `QuizSelection` | `quizSelectionLoader` (data only) | public |
| `/quiz/:quizId/play` | `QuizPageRouteWrapper` | — (no loader) | ⚠️ logged-in users get the real flow; signed-out visitors get one free guest attempt — see [`guest-play.md`](./guest-play.md). The component itself decides, not the loader. |
| `/play/shared/:token` | shared-quiz play | — | **Planned client wiring.** Backend ready (`GET /api/quiz/shared/{token}` + `QuizSessionCM.ShareToken`); login required, resolves an Unlisted quiz from its share token (the token is the access grant). See [`quiz-visibility.md`](./quiz-visibility.md). |
| `/quiz/results/:sessionId[/review]` | results | **`userAuthLoader`** | ✅ gated (real sessions only) |
| `/quiz/results-guest/:sessionId` | guest results | — (no loader) | public on purpose — guest sessions only, see [`guest-play.md`](./guest-play.md) |
| **`/multiplayer/create`** | `CreateLobby` | — | ❌ **public** |
| **`/multiplayer/join`** | `MultiplayerLobbyPage` | — | ❌ **public** |
| **`/multiplayer/lobby/:sessionId`** | `MultiplayerLobbyPage` | — | ❌ **public** |

Single-player is already gated twice over: the route runs `userAuthLoader`, and
`QuizPageRouteWrapper` also `Navigate`s to `/login?redirectTo=…` when there's no user. The
**three multiplayer routes have no loader** — anyone can reach them. The **invite link** built
in `use-lobby-connection.ts` (`handleCopyInvite`) points at the public
`…/multiplayer/join?code=XYZ`, which is exactly where a logged-out person lands and is asked
only for a username.

### Identity is client-supplied, not the account

`username` is **local component state** typed by the user in both flows:

- `components/create-lobby.tsx` — `const [username, setUsername] = useState("")` → passed to
  `createSession(...)`.
- `hooks/use-lobby-connection.ts` — same, via the `JoinForm` username input.

So the host's name is *whatever they type*. There is no link to `useUser()`.

### The hub trusts the client (`OxygenBackend/QuizAPI/Hubs/QuizHub.cs`)

`QuizHub` has **no `[Authorize]`**. Every method takes `username` as a plain parameter
(`JoinSession(sessionId, username)`, `CreateSession(..., username)`, …) and trusts it. The
client builds the connection **anonymously** (`src/context/multiplayer-context.tsx`):

```ts
new signalR.HubConnectionBuilder().withUrl(hubUrl).withAutomaticReconnect().build()
//  ^ no accessTokenFactory — no JWT is ever sent to the hub
```

So even a perfect frontend gate could be bypassed by invoking the hub directly. Real
enforcement has to happen on the hub.

## Design — three layers

Do all three. (A)+(B) deliver the visible behaviour; (C) is the security backstop.

### (A) Gate the multiplayer routes — frontend

Add `loader: userAuthLoader(queryClient)` to `/multiplayer/create`, `/multiplayer/join`, and
`/multiplayer/lobby/:sessionId` in `Router.tsx`.

`createAuthLoader` (`src/lib/Auth.tsx`) already redirects unauthenticated users to
`/login?redirectTo=<current url>`. So an invited, logged-out user flows:

```
open  /multiplayer/join?code=XYZ
      └─ userAuthLoader: not logged in
         └─ redirect /login?redirectTo=%2Fmultiplayer%2Fjoin%3Fcode%3DXYZ
            └─ user logs in
               └─ returns to /multiplayer/join?code=XYZ, now authenticated
```

This **replaces "type a username" with "log in"** for invite links, with zero new redirect
plumbing — `redirectTo` is already honored.

### (B) Use the account username — frontend

- Read the user once: `const { data: user } = useUser();` (guaranteed present after (A)).
- **Remove the username `<input>`** from `JoinForm` and `CreateLobby`; the join screen shows
  "Joining as **{user.username}**" instead.
- Seed identity from the account: in `use-lobby-connection.ts` and `create-lobby.tsx`, use
  `user.username` everywhere `username` is currently read (join/create/leave/toggleReady/
  chat/auto-resume). `user.username` is confirmed to exist on the user type
  (`src/types/user-types.ts`).
- Auto-resume (`sessionStorage "quiz_session"`) keys off `user.username` too.

After (A)+(B), the host is whoever created the lobby, named by their real username.

### (C) Enforce identity on the hub — backend (the actual security)

1. **`[Authorize]` on `QuizHub`.** Unauthenticated sockets can't invoke anything.
2. **Send the JWT from the client.** Build the connection with an access-token factory that
   reads the in-memory token (`getAccessToken` from `src/lib/token-store.ts`):
   ```ts
   .withUrl(hubUrl, { accessTokenFactory: () => getAccessToken() ?? "" })
   ```
   The factory is re-invoked on (re)connect, so a refreshed token is picked up. Note the
   connection is currently created once in `MultiplayerProvider` mounted high in the tree —
   it must be (re)established **after** auth is available (and rebuilt on logout/login).
3. **Derive `username` server-side from `Context.User`**, not from a parameter — read the
   username/`sub` claim (the JWT already carries id, email, username, roles — see
   [`authentication.md`](./authentication.md)). Then **drop the client `username` arguments**
   from the hub methods (or ignore them). This makes spoofing impossible and *auto-fixes*
   identity at the source — the lobby name can only ever be the authenticated user's.

> **Change surface for (C):** every `QuizHub` method that currently takes `username`
> (`JoinSession`, `LeaveSession`, `ToggleReady`, `SubmitAnswer`, `CreateSession`) and its
> matching client invoke in `multiplayer-context.tsx`. `SendLobbyMessage`/`StartMatch`/
> `SelectQuiz` already pull the user from `Context.Items` — switch those to `Context.User` too.

## Edge cases & decisions

- ~~**No more guest play.**~~ **Superseded (2026-06-22).** Singleplayer now allows one free
  anonymous attempt per browser, with no persistence and a soft cookie-based limit — see
  [`guest-play.md`](./guest-play.md). Multiplayer remains fully login-gated; nothing below about
  the hub or identity-spoofing changes.
- **Token expiry mid-lobby:** with `accessTokenFactory`, SignalR's reconnect re-reads a fresh
  token; the existing silent-refresh keeps the in-memory token current.
- **Same account, two tabs:** username would collide in a lobby. Pre-existing concern; out of
  scope here, but note it (could block or suffix).
- **Require confirmed email to host?** Optional tie-in with
  [`email-verification.md`](./email-verification.md) — gate *hosting* on `EmailConfirmed`.
- **Hardcoded hub URL** (`https://localhost:7153` in `multiplayer-context.tsx`) should move to
  an env var while we're in this file (tracked in `multiplayer-analysis.md`).

## Files to touch

**Frontend** (✅ = done in the A+B pass)
- ✅ `src/routes/Router.tsx` — `userAuthLoader` on the three multiplayer routes (A).
- ✅ `src/pages/Quiz/Multiplayer/components/lobby/join-form.tsx` — username input → "Joining as" (B).
- ✅ `src/pages/Quiz/Multiplayer/MultiplayerLobbyPage.tsx` — drop `setUsername`/`onUsernameChange` (B).
- ✅ `src/pages/Quiz/Multiplayer/components/create-lobby.tsx` — drop input, use `useUser` (B).
- ✅ `src/pages/Quiz/Multiplayer/components/create-lobby-dialog.tsx` — kill the random-`Player1234`
  fallback; require login; use `user.username` (B).
- ✅ `src/pages/Quiz/Multiplayer/components/join-lobby-dialog.tsx` — drop username input; require
  login; use `user.username` (B).
- ✅ `src/pages/Quiz/Multiplayer/hooks/use-lobby-connection.ts` — source `username` from account (B).
- ✅ `src/pages/Quiz/Multiplayer/hooks/use-match.ts` — `submitAnswer` no longer sends `username` (C).
- ✅ `src/context/multiplayer-context.tsx` — `accessTokenFactory`; connect **only when
  authenticated** (gated on `userId`, torn down on logout); dropped the client `username` args (C).

**Backend (✅ layer C, done)**
- ✅ `OxygenBackend/QuizAPI/Hubs/QuizHub.cs` — `[Authorize]`; `GetUsername()` derives identity
  from the `"username"` claim on `Context.User`; dropped the `username` params from
  `JoinSession` / `LeaveSession` / `SubmitAnswer` / `ToggleReady` / `CreateSession`.
- ✅ `Program.cs` — extended the existing SignalR `OnMessageReceived` to also read
  `access_token` for the `/quizHub` path (it already did so for `/notificationHub`).

## Testing plan

- Logged-out invite link → bounced to `/login?redirectTo=…` → after login lands in the lobby,
  shown as host under the **account username**.
- Two accounts: host + joiner; names match their accounts; host badge on the creator.
- **Spoof attempt:** invoke `CreateSession` directly without a token (or with another name) →
  rejected once `[Authorize]` + server-derived identity are in place.
- Token refresh during a long lobby session keeps the socket alive.

## Related

- [`authentication.md`](./authentication.md) — `userAuthLoader`, `redirectTo`, the JWT claims.
- [`multiplayer-analysis.md`](./multiplayer-analysis.md) — broader multiplayer overview (notes
  "No security/authentication" as a known limitation; this doc is that plan).
- [`email-verification.md`](./email-verification.md) — optional host gate.
