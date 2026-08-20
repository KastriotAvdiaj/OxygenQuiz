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

## Publishing requires a full classification

**A quiz may only be `Public` when its category, language and difficulty are all real** — none
of them the seeded "Unspecified" row. Draft and Unlisted are unaffected.

This is a gate, not a ban. Unspecified is a drafting state: parking a half-built quiz, or
importing one you intend to classify later, are both legitimate. Forbidding the value outright
would block those; allowing it everywhere lets an unclassifiable quiz into the catalogue. Tying
it to `Public` puts the rule exactly where the harm is.

The harm is specific. The catalogue's default sort is `variety`, which ranks each quiz by
recency *within its category* and interleaves ([quiz-discovery.md](quiz-discovery.md)), and the
filter panel facets on all three lookups ([filtering.md](filtering.md)). A public quiz filed
under Unspecified is therefore either unreachable by every real facet, or it surfaces an
internal placeholder to end users as a browsable category. Neither happens to a draft, which is
why the rule is scoped to publication.

**Difficulty counts here**, even though a *question* may stay Unspecified forever
([quiz-question-classification.md](quiz-question-classification.md)). The two aren't in
conflict: a question's difficulty is bank metadata that nothing reads at play time, while a
quiz's difficulty is a discovery facet. Different field, different job.

### Where it's enforced

| Layer | What it does |
|---|---|
| **API** (`QuizService.EnsurePublishableAsync`) | The gate. Runs on all four paths that can set a status — `CreateQuizAsync`, `CreateAiQuizAsync`, `UpdateQuizAsync` and `SetQuizStatusAsync` — and throws `AppValidationException` → **400** naming the offending fields. The status-only PATCH is included deliberately: it is the one way to publish without touching the classification. |
| **Client** (`create-quiz.tsx`) | The Public option is rendered **disabled** rather than removed, with a line underneath naming what's missing — a missing option reads as a feature that doesn't exist, a greyed one reads as a condition you can satisfy. Selecting Unspecified while Public is already chosen falls the status back to Draft. |

This is separate from, and stricter than, the AI-import rule that a quiz's category and language
may not be Unspecified *at all*. That one exists because AI-import questions **inherit** those
two values and a question may never be stored as Unspecified — it says nothing about difficulty,
and nothing about publishing. A quiz can clear it and still fail this gate.

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

### Questions inside a quiz you may play

There is a **second** global query filter, on `QuestionBase`, and it is easy to forget it exists
because the quiz-level one gets all the attention. A question loads when any of these holds:

1. the caller is an admin;
2. the caller owns the question;
3. the question is not `Private`;
4. the question sits in a quiz the caller may see — **`Public`, or owned by them**.

Rule 4 is what makes a quiz playable at all, because **questions authored inside a quiz are
`Private`**. Both creation paths do this deliberately, to keep the shared bank clean: the AI import
(`QuizService.BuildAiQuestionEntity`) and the manual builder (`DEFAULT_NEW_*` in the frontend's
`constants.ts`). So for almost every quiz anyone builds in this app, rule 3 fails and rule 4 is the
only thing carrying it.

> **The bug this rule shipped with (2026-08-19).** Rule 4 read
> `_current.UserId != null && (qq.Quiz.UserId == _current.UserId || qq.Quiz.Status == Public)` —
> the null-check wrapped **both** halves. "This question is in a public quiz" needs no signed-in
> user, but a guest short-circuited to false before reaching it, so every Public quiz built from
> newly-authored questions was unplayable while logged out.
>
> It failed indirectly, which is why it took so long to find. The `QuizQuestion` join row has no
> filter, so `FirstAsync(...Include(qq => qq.Question))` in `QuizSessionService` returned a row
> with `Question` **null** — query filters apply to included navigations — and the crash arrived
> one line later as a `NullReferenceException` on `qq.Question.Text` inside `ToCurrentQuestionDto`,
> reported as a bare 500 from `GET /{sessionId}/next-question`.
>
> It looked like an AI-generation bug for weeks because AI quizzes were simply the first ones
> anyone opened in a signed-out tab. Covered now by
> `QuizAPI.Tests/Visibility/QuestionVisibilityFilterTests.cs`, including the inverse — a Private
> question in a **Draft** quiz must stay hidden from a guest.

**If you touch either filter, test as a guest.** Being signed in as the owner passes rule 2 and
being signed in as anyone else passes rule 4's other half, so both authenticated cases sail through
a filter that is broken for everybody else.

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
