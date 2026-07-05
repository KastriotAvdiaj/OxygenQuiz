# Guest play — one free singleplayer quiz, no account required

> **Status: implemented (2026-06-22).**
> Supersedes the "no guest play" decision recorded in
> [`play-auth-and-identity.md`](play-auth-and-identity.md) — see that file's "Edge cases"
> section for the prior reasoning, kept for history.

## Product rule

A signed-out visitor may play **exactly one singleplayer quiz** per browser, for free, with no
account. The result is **shown once and then discarded** — nothing about a guest attempt is
saved anywhere. Guests **cannot** access multiplayer at all; that stays fully gated behind login,
unchanged.

This exists to lower signup friction (try the product before committing to an account) without
reopening the security surface that made [`play-auth-and-identity.md`](play-auth-and-identity.md)
require login in the first place.

## The limit is soft, by design

The one-quiz limit is enforced with an **HttpOnly cookie** (`guest_played`), not a hard server-side
identity check. Anyone can get another free quiz by clearing cookies or opening an incognito
window. **This is intentional, not a bug to fix later:**

- There is no account to tie a hard limit to — the entire point is no signup is required.
- A hard limit (IP-based throttling, device fingerprinting) is real engineering effort for a goal
  that doesn't need it: this is a conversion nudge ("try it, then sign up"), not a paywall or an
  anti-abuse control. Nobody is harmed by a determined person playing two free quizzes.
- If abuse ever becomes a real problem (e.g. guest play getting hit by scripted traffic), revisit
  with IP-based rate limiting at the reverse proxy / API gateway layer — don't solve it by adding
  client-side complexity, which a script ignores anyway.

## Why guest sessions don't reuse the real session pipeline's persistence

The authenticated singleplayer flow (`QuizSessionsController` → `QuizSessionService` →
`QuizSession`/`UserAnswer` tables) has substantial business logic: question sequencing, timers,
mathematical catch-up on resume, abandonment detection, grading for non-instant-feedback quizzes.
Re-implementing an equivalent in-memory engine for guests (mirroring the existing
`InMemoryQuizSessionManager` used for live multiplayer lobby state) would duplicate all of that —
two copies of timer/grading logic to keep in sync forever, for a feature that's supposed to be a
thin shim.

Instead, **guest play reuses the exact same `QuizSessionService` engine**, with two differences:

1. Every guest session is attached to a single, fixed, shared placeholder account
   (`GuestAccount.Id`) instead of a real user — because `QuizSession.UserId` is a required
   foreign key, and there's no real account to point it at.
2. The session row (and its answers) is **deleted outright** the moment the guest has viewed
   their results — see "Lifecycle" below. So "not saved" is achieved by writing it like every
   other session, then deleting it immediately, not by avoiding persistence in the first place.

This means any future change to question sequencing, grading, or timing logic automatically
applies to guest play too — there's only ever one implementation to maintain.

## Architecture

### Backend

| Piece | File | Purpose |
|---|---|---|
| `GuestAccount` | `OxygenBackend/QuizAPI/Services/GuestAccount.cs` | Fixed `Guid` (`00000000-0000-0000-0000-000000000001`) every guest session's `UserId` points at. |
| Seeding | `OxygenBackend/QuizAPI/Services/DbSeeder.cs` (`EnsureGuestAccountAsync`) | Creates the row once on startup, idempotently. The account's password hash is random and never communicated — it's never used to log in. |
| `QuizSession.IsGuestSession` | `OxygenBackend/QuizAPI/Models/Quiz/QuizSession.cs` | `bool`, default `false`. The only schema change (migration `AddGuestQuizSessions`). |
| `IQuizSessionService.CreateGuestSessionAsync` / `IsGuestSessionAsync` / `DiscardGuestSessionAsync` | `Controllers/Quizzes/Services/QuizSessionServices/QuizSessionService.cs` | New methods alongside the existing real-account ones. |
| `GuestQuizSessionsController` | `OxygenBackend/QuizAPI/Controllers/Quizzes/GuestQuizSessionsController.cs` | The anonymous route surface (`/api/guest-quiz-sessions/*`). No `[Authorize]` anywhere — see "Security model" below for how it stays safe without it. |
| Guest-aware cleanup | `Controllers/Quizzes/Services/QuizSessionServices/AbandonmentService/SessionAbandonmentService.cs` (`MarkSessionsAsAbandonedAsync`) | The existing periodic abandoned-session sweep now **deletes** guest sessions instead of marking them "completed" — see Lifecycle. |

`GuestQuizSessionsController` routes (all under `/api/guest-quiz-sessions`):

| Route | Mirrors (real controller) | Notes |
|---|---|---|
| `GET /can-play` | — (guest-only) | Frontend checks this before offering guest play. |
| `POST /` | `POST /api/QuizSessions` | Rejects with 403 if `guest_played` cookie is already set. |
| `GET /{id}/current-state` | `GET /api/QuizSessions/{id}/current-state` | |
| `GET /{id}/next-question` | `GET /api/QuizSessions/{id}/next-question` | |
| `POST /answer` | `POST /api/QuizSessions/answer` | |
| `POST /{id}/complete` | `POST /api/QuizSessions/{id}/complete` | |
| `GET /{id}/results` | `GET /api/QuizSessions/{id}/results` | |
| `POST /{id}/finish` | — (guest-only) | Deletes the session + answers, sets `guest_played`. |

There is **no** guest equivalent of resume, abandon-and-restart, or "get user's sessions" — a
guest only ever has the one session this flow creates, so none of that applies.

### Security model — why an anonymous controller is safe here

Every route on `GuestQuizSessionsController` (except `can-play` and the create route) calls
`IsGuestSessionAsync(sessionId)` **before** touching the session, and returns `404` if the
session isn't flagged `IsGuestSession = true`. This is the load-bearing check: it means this
anonymous surface can only ever read or write a session that was *itself* created through the
guest path. It cannot be used to reach a real, logged-in user's session by guessing or enumerating
a GUID — which is exactly the [IDOR class of bug](../deployment/known-issues.md) the authenticated
`QuizSessionsController` still needs fixing for (that fix is independent of this feature: it's
about deriving `UserId` from the JWT instead of trusting a client-supplied value, and doesn't
affect guest play at all).

`CreateGuestSessionAsync` (the guest equivalent of `CreateSessionAsync`) deliberately **skips**
the "you already have an active session for this quiz" check that real accounts get. That check
looks up active sessions by `UserId + QuizId` — since every guest shares the same `UserId`, that
lookup would otherwise treat one stranger's in-progress guest quiz as blocking a *different*
stranger from starting one. Guests simply don't have that collision risk in the first place
(each gets their own session row, just under a shared `UserId`), so the check is skipped, not
reimplemented.

### Frontend

| Piece | File | Purpose |
|---|---|---|
| Guest API client | `src/pages/Quiz/Sessions/api/guest-quiz-session.ts` | Talks to `/guest-quiz-sessions/*`. Kept separate from the real session API client (mirrors the backend split). |
| `useGuestQuizSession` | `src/hooks/use-guest-quiz-session.ts` | Deliberately simpler than `useQuizSession` — no resume/abandon state machine, since a guest only has one session. |
| `GuestQuizPage` | `src/pages/Quiz/Sessions/components/quiz-taking-process/guest-quiz-page.tsx` | Reuses the same `QuizInterface` component the real flow uses — question rendering, timers, and feedback UI are shared. |
| `QuizPageRouteWrapper` (modified) | `src/pages/Quiz/Sessions/components/quiz-taking-process/quiz-page-route-wrapper.tsx` | The single entry point for `/quiz/:quizId/play`. Branches three ways — see "Routing" below. |
| `GuestQuizResultsRouteWrapper` | `src/pages/Quiz/Sessions/components/quiz-results/guest-quiz-results-route-wrapper.tsx` | Public results page at `/quiz/results-guest/:sessionId`. Calls `/finish` as soon as results load. |

### Routing

`/quiz/:quizId/play` has **no route loader** (the `userAuthLoader` was removed). Instead,
`QuizPageRouteWrapper` itself decides what to render:

```
visit /quiz/:quizId/play
 ├─ logged in?            → render <QuizPage>          (existing real flow, untouched)
 ├─ not logged in:
 │   ├─ GET /guest-quiz-sessions/can-play
 │   │   ├─ canPlay: true  → render <GuestQuizPage>
 │   │   └─ canPlay: false → redirect /login?redirectTo=...&guestUsed=1
```

Results live on **two different routes**, so there is never ambiguity about which backend a given
session id belongs to:

- `/quiz/results/:sessionId` — unchanged, still gated by `userAuthLoader`. Real sessions only.
- `/quiz/results-guest/:sessionId` — new, public. Guest sessions only. The guest flow always
  navigates here, never to the real results route.

Multiplayer routes are untouched — they still require login at the route level
(`userAuthLoader` per [`play-auth-and-identity.md`](play-auth-and-identity.md)), so a guest
never reaches them at all; there's no guest-mode fallback for multiplayer anywhere.

## Lifecycle of a guest session

```
1. Visitor opens /quiz/:quizId/play, not logged in, guest_played cookie absent
     → POST /guest-quiz-sessions  (creates QuizSession, UserId = GuestAccount.Id, IsGuestSession = true)

2. Plays through questions exactly like a real session
     → GET next-question / POST answer, repeated — same engine, same grading, same timers

3a. Happy path: finishes all questions
     → frontend navigates to /quiz/results-guest/:sessionId
     → GET results loads the graded session
     → frontend calls POST /finish
         → backend deletes UserAnswers + the QuizSession row
         → backend sets the guest_played cookie (1 year)
     → nothing about this attempt exists anywhere anymore

3b. Abandoned path: visitor closes the tab mid-quiz, never reaches results
     → the existing periodic abandoned-session cleanup job picks it up later
     → because IsGuestSession = true, the cleanup DELETES the row (and its answers)
       instead of marking it "completed" the way a real account's session would be
     → the guest_played cookie is never set in this path — that browser still has its
       free quiz available (consistent with "the limit is soft, not a security boundary")
```

There is no path where a guest session outlives the attempt. Either the guest finishes and views
results (deleted immediately by `/finish`), or they don't and the cleanup job deletes it within
its normal sweep window.

## What to update if this changes

- **Want to allow more than one guest quiz?** Change the `can-play` check in
  `GuestQuizSessionsController` (currently: cookie presence). Don't add per-guest accounts —
  keep the shared `GuestAccount` pattern; the session row's GUID is already the unique handle.
- **Want guests to see *some* persisted history (e.g. across multiple quizzes before signup)?**
  That's a bigger change — it means guest sessions need their own per-browser identity instead of
  a shared account, which reopens the "active session" collision problem `CreateGuestSessionAsync`
  currently sidesteps. Don't bolt this on without re-deriving that part.
- **Want guest play in multiplayer?** Out of scope by design — `QuizHub` requires `[Authorize]`
  and there is no plan to change that (see [`play-auth-and-identity.md`](play-auth-and-identity.md)).

## Related

- [`play-auth-and-identity.md`](play-auth-and-identity.md) — why login is required at all;
  the "no guest play" line there is superseded by this doc.
- [`known-issues.md`](../deployment/known-issues.md) — the still-open P1 (authenticated `QuizSessionsController`
  has no ownership check) is independent of this feature, but worth fixing with the same
  IDOR-prevention mindset used here.
- [`quiz-grading.md`](../quiz/quiz-grading.md) — the grading engine guest sessions reuse unchanged.
