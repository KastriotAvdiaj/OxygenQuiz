# Quiz visibility & sharing

A quiz has a single access state — its **`Status`** — that decides who can find and play it.
This replaced the old `Visibility` + `IsPublished` + `IsActive` trio, which overlapped and was
enforced inconsistently.

## The three states

| Status | Discoverable in the catalogue? | Who can play | Notes |
|---|---|---|---|
| **Draft** | No | Owner (and admins) only | Work in progress. Share links don't work. |
| **Unlisted** | No | Anyone with the **share link** or invited into a **lobby** hosting it | Not listed anywhere; the token/lobby is the access grant. |
| **Public** | Yes | Everyone (including anonymous guests) | Listed in the public catalogue and search. |

The owner sets the status when creating/editing a quiz, or via `PATCH /api/quiz/{id}/status`.

## How access is enforced

There is one discovery rule and a couple of explicit capability paths.

### Discovery (lists, search, catalogue)
The EF Core global query filter on `Quiz` (`ApplicationDbContext`) returns a quiz only when it is
`Public`, owned by the caller, or the caller is an admin. So **Draft and Unlisted quizzes never leak
into any list or search** — the public catalogue endpoints filter to `Status == Public` to match.

### Unlisted via share link
- The owner calls `POST /api/quiz/{id}/share-link` to lazily generate (and thereafter reuse) an
  unguessable `ShareToken`. The token is only ever returned to the owner.
- A visitor opens `/play/shared/{token}`, which resolves the quiz through
  `GET /api/quiz/shared/{token}`. That endpoint bypasses the discovery filter on purpose
  (`IgnoreQueryFilters`) because the token *is* the grant; it returns 404 for an unknown token or a
  Draft quiz.
- **Login is required to play** even with a valid link — the token grants access, the account ties
  the play session to a user. Starting the session sends the token in `QuizSessionCM.ShareToken`,
  which `QuizSessionService.IsPlayAuthorized` validates.

### Unlisted via multiplayer lobby
- A host may select a quiz that is `Public` **or one they own** (any status, including Unlisted/Draft).
  `QuizHub.SelectQuiz` validates this server-side via `IQuizService.CanHostQuizAsync` — the client's
  quiz id is never trusted.
- Participants who join the lobby inherit play access for that match; lobby membership is the grant,
  so no per-player token is needed. The match loads questions with `ignoreFilters: true` because it
  runs in a background scope with no current user.

### Guests
Anonymous guest play (`GuestQuizSessionsController`) is limited to `Public` quizzes — there's no
account or token to authorize Unlisted/Draft access.

## Authorization summary

| Caller | Draft | Unlisted | Public |
|---|---|---|---|
| Owner | ✅ | ✅ | ✅ |
| Other signed-in user with the share token | ❌ | ✅ | ✅ |
| Other signed-in user without the token | ❌ | ❌ | ✅ |
| Lobby participant (host owns the quiz) | ✅ (via lobby) | ✅ (via lobby) | ✅ |
| Anonymous guest | ❌ | ❌ | ✅ |
| Admin | ✅ | ✅ | ✅ |

## Import / export

Quiz import/export uses a single `Status` column (`Draft` / `Unlisted` / `Public`). Legacy files
that still carry `Visibility` (`Private` / `Friends`) map to `Unlisted`; unrecognised values default
to `Draft`. See [import-templates/README.md](../data/import-templates/README.md).

## Implementation status

Done:
- Backend model (`QuizStatus` + `ShareToken`), migration with data backfill, and the full
  enforcement surface (discovery filter, session-create authorization, share-token endpoints,
  `QuizHub.SelectQuiz` validation, guest-play restriction).
- Frontend status model: create/edit form status selector, dashboard status column + filter, and the
  owner-side **share-link generation + copy** on the quiz detail page.

Remaining client wiring:
- The `/play/shared/:token` route that resolves a token and starts a session passing
  `QuizSessionCM.ShareToken` (the backend contract is in place).
- A "My quizzes" scope in the multiplayer lobby's quiz picker so a host can pick their own Unlisted
  quiz (the hub already authorizes owned quizzes server-side).
