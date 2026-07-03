# Known Issues & Deferred Improvements

A running backlog of things worth fixing **eventually** but that are **not active
threats or blockers** — so they don't get lost, and so day-to-day work can stay
focused on what matters. When you spot a similar "should fix someday, not now"
item, add it here instead of letting it float.

**Priority key**
- **P2** — address before / around a public production launch.
- **P3** — cleanup / nice-to-have; do it when you're in the area.

Auth-specific enhancements are tracked in [authentication.md](authentication.md)
("Recommended improvements"); the security-review status lives in
[handoff.md](handoff.md). This file is the catch-all index.

---

## Security hardening (defense-in-depth — no known active exploit)

- ~~**P2 — SVG uploads allowed.**~~ **Fixed.** Dropped `.svg` from `FileService`'s
  image allow-list — uploads are served from the app's own origin, so a crafted
  SVG opened directly would have executed script (stored XSS).
  → `OxygenBackend/QuizAPI/Controllers/Files/Services/FileService.cs`
- ~~**P2 — Hangfire dashboard has no auth filter.**~~ **Fixed.** The dashboard
  is now only mapped outside `Production`. A role-based authorization filter
  wasn't viable yet because this API only does JWT-bearer auth (header-based),
  and a dashboard opened directly in a browser has no header to check —
  that becomes the right fix once there's a cookie-based admin login.
  → `OxygenBackend/QuizAPI/Program.cs`
- ~~**P2 — Public user-read endpoints leak email.**~~ **Fixed.** Added
  `[Authorize]` to `GET /api/users/{id}`, `GET /api/users/username/{username}`,
  and `POST /api/users/batch` — confirmed nothing in the frontend calls them
  anonymously.
  → `OxygenBackend/QuizAPI/Controllers/Users/UsersController.cs`
- ~~**P2 — `QuizHub.SelectQuiz` trusted the client's quiz id.**~~ **Fixed.** The host's
  selection is now validated server-side via `IQuizService.CanHostQuizAsync` (Public quiz or one the
  host owns), so a crafted SignalR call can't host an arbitrary quiz regardless of the picker UI.
  Part of the quiz-visibility rework — see `docs/quiz-visibility.md`.
  → `OxygenBackend/QuizAPI/Hubs/QuizHub.cs`
- ~~**P1 — Quiz session endpoints have no authentication or ownership checks.**~~
  **Fixed (2026-06-23).** `QuizSessionsController` now carries `[Authorize]`, and
  every session-scoped action verifies ownership before acting: a new
  `IQuizSessionService.GetSessionOwnerAsync` backs a controller helper that
  returns **404** for a session the caller doesn't own (so ids can't be probed).
  The acting user is always taken from the JWT, never a client-supplied `userId`
  — create / resume / resolve-and-resume / abandon-and-restart pin to the
  authenticated identity, and `GET user/{userId}` is restricted to the caller's
  own history (admins exempt). The global `cleanup` endpoint is now
  `[Authorize(Roles = "Admin,SuperAdmin")]`. The shared `QuizSessionService` and
  the anonymous `GuestQuizSessionsController` (which guards itself per-request via
  `IsGuestSession`) were deliberately left untouched, so guest play and SignalR
  multiplayer are unaffected.
  → `OxygenBackend/QuizAPI/Controllers/Quizzes/QuizSessionsController.cs`
- **New (2026-06-22) — guest singleplayer play.** Signed-out visitors can now
  play one free singleplayer quiz per browser (soft, cookie-based limit; no
  persistence; multiplayer stays fully login-gated). Full design, security
  model, and lifecycle in [`guest-play.md`](./guest-play.md).
- ~~**P2 — Admin-facing totals exposed with no auth.**~~ **Fixed (2026-06-23).**
  `TotalsController` now carries `[Authorize(Roles = "Admin,SuperAdmin")]`, matching
  the rest of the dashboard surface. (The only caller is the admin Dashboard, which
  already sends the bearer token.)
  → `OxygenBackend/QuizAPI/Controllers/Totals/TotalsController.cs`
- ~~**P2 — Exported files served without `Content-Disposition: attachment`.**~~
  **Fixed (2026-06-23).** Both export controllers were already returning files via
  the `File(content, contentType, fileDownloadName)` overload, which sets
  `Content-Disposition: attachment` — so downloads were never actually served
  inline. The remaining gap (the content-sniffing vector) is now closed with a
  global `X-Content-Type-Options: nosniff` response header, so a browser can't
  MIME-sniff an export into something executable.
  → `OxygenBackend/QuizAPI/Program.cs` (nosniff middleware),
  `OxygenBackend/QuizAPI/Controllers/Reports/ReportsController.cs`,
  `OxygenBackend/QuizAPI/Controllers/DataTransfer/DataTransferController.cs`
- ~~**P2 — Signup password policy has no complexity requirement.**~~
  **Fixed (2026-06-23).** Minimum length raised to 12 (from 8), and signup now
  screens the password against a local common/breached-password blocklist
  (`NotACommonPassword`) plus a trivial-pattern check — rather than hand-rolling
  composition rules, per current NIST guidance. The embedded list is a small,
  self-contained subset; it can be swapped for the full "Have I Been Pwned"
  Pwned Passwords dataset (local copy or k-anonymity range API) if stronger
  coverage is wanted later. The frontend signup schema mirrors the new 12-char
  minimum.
  → `OxygenBackend/QuizAPI/DTOs/Authentication/SignupDTO.cs`,
  `OxygenBackend/QuizAPI/DTOs/Authentication/NotACommonPasswordAttribute.cs`,
  `src/lib/Auth.tsx`
- **P3 — `AllowedHosts: "*"`.** Set to the real host name(s) in production to
  blunt host-header attacks. → `OxygenBackend/QuizAPI/appsettings.json`
- **P3 — Broad CORS.** The policy uses `AllowAnyHeader` + `AllowAnyMethod` with
  credentials. It's origin-restricted, so low risk, but tighten the header/method
  surface if practical. → `OxygenBackend/QuizAPI/Program.cs`
- **P3 — Question search endpoints are fully public.** `GET /api/questions/search`
  and the type-specific search variants (multiple-choice, true/false,
  type-the-answer) have no `[Authorize]`, exposing question content/metadata
  to anonymous callers. Confirm this is intentional (public quiz browsing) —
  if any question content is meant to stay private to its owner, this needs
  an auth/ownership filter to match.
  → `OxygenBackend/QuizAPI/Controllers/Questions/QuestionsController.cs`
- **P3 — Image upload allow-list drifted from `FileService`'s.** `ImageUploadController`
  maintains its own separate format allow-list (still includes GIF) rather than
  sharing `FileService`'s. Not a vulnerability on its own, but two allow-lists
  for the same concern will eventually disagree.
  *Fix:* consolidate on one allow-list/service.
  → `OxygenBackend/QuizAPI/Controllers/Image/ImageUploadController.cs`

## Code quality / cleanup

- **P3 — Multiplayer & singleplayer gameplay UIs diverged (being unified).**
  The live multiplayer match screen (`MultiplayerGame.tsx`) was built with its
  own bespoke question/answer markup (`QuestionPanel` + `AnswerInput`), visually
  unlike the singleplayer experience (`QuestionDisplay` + the per-type answer
  components, `QuizTimer`, `QuestionMedia`). They drift independently and a
  styling change to one silently skips the other.
  *In progress (2026-06-22):* the multiplayer **question screen** now reuses the
  singleplayer leaf components via an adapter
  (`MultiplayerQuestionView`) + a shared `QuestionCard`. Remaining divergence is
  the inherently multiplayer-only phases (pre-match countdown, between-question
  reveal/scoreboard, final results) — those have no singleplayer equivalent, so
  they stay multiplayer-specific; only their theming should be kept in line.
  → `src/pages/Quiz/Multiplayer/components/game/`,
  `src/pages/Quiz/Sessions/components/quiz-taking-process/`
- **P3 — Dead controller.** `AnswerOptionsController.cs` is entirely commented
  out (no live route). Delete the file.
  → `OxygenBackend/QuizAPI/Controllers/Questions/AnswerOptionsController.cs`
- **P3 — Class/route name mismatch.** The class `QuizController` lives in a file
  named `QuizzesController.cs`, so its routes resolve to **`/api/Quiz`**, not the
  expected `/api/quizzes`. Confusing when reading or calling the API; rename the
  class (and file) for consistency.
  → `OxygenBackend/QuizAPI/Controllers/Quizzes/QuizzesController.cs`
- **P3 — Create responses omit nested names.** `POST /api/Quiz` and
  `POST /api/QuestionCategories` return blank `category` / `language` / `user`
  fields, because the service maps the just-created entity *before* EF loads its
  navigation properties. (The `GET` detail endpoints return them fully populated,
  so it's cosmetic.) *Fix:* reload the entity with includes before mapping.
  → `QuizService.CreateQuizAsync`, `QuestionCategoriesController.PostQuestionCategory`
- **P3 — Quiz delete with sessions → 500.** Deleting a quiz that already has
  sessions/answers throws an FK error surfaced as a generic 500 instead of a
  friendly 409 ("can't delete a quiz that has been played").
  → `QuizService.DeleteQuizAsync`
- **P3 — Build warnings.** ~130 compiler warnings, mostly nullable-reference and
  a couple of duplicate `using` directives (`Program.cs` → `System.Text`;
  `TotalsController.cs` → `QuizAPI.Models`). Chip away incrementally.
- **P3 — `!` on EF navigations can crash after the FK is cleared.** When a
  tracked entity's foreign key is set to `null` and `SaveChanges` runs, EF
  relationship fixup also nulls the matching navigation property. So any
  `session.CurrentQuizQuestion!.Question`-style read *after* the question is
  cleared NREs at runtime — the `!` only silences the compiler, it doesn't guard
  anything. One instance (in `BuildResultDto`, on Incorrect/TimedOut answers) is
  fixed by capturing the question before `ClearCurrentQuestion`, but the
  null-forgiving pattern recurs across the quiz-session services. *Fix:* audit
  for `!` on EF navigations that are dereferenced after a clear/`SaveChanges`,
  and capture the reference before mutating the FK (or null-check instead of `!`).
  → `OxygenBackend/QuizAPI/Controllers/Quizzes/Services/QuizSessionServices/` (esp.
  `SubmitAnswerService`, `QuizSessionService`, `AbandonmentService`)

## Repo hygiene

- ~~**P2 — Committed build artifacts.**~~ **Fixed.** Untracked the
  recursively-nested `publish/` tree (~355 files) and added it to `.gitignore`.
  It contained stale copies of the JWT key from before it was rotated
  (`750dd69`); the key is no longer live, and the decision was made to keep
  the old commits as-is (no history rewrite) and rely on making the repo
  private at publish time instead of rewriting shared git history.
- **P3 — Tracked `.env` files.** `.env.production` / `.env.development` are
  tracked despite being listed in `.gitignore`. Only URLs today, but the pattern
  risks leaking a future secret. *Fix:* `git rm --cached` them.

## Operations / deployment

- **P2 — EF migrations run at startup.** `context.Database.MigrateAsync()` runs
  on boot; with more than one instance starting together this races. Only matters
  once you scale past a single instance. *Fix:* run migrations as a one-off step
  in the deploy pipeline. → `OxygenBackend/QuizAPI/Program.cs`
- **P3 — Single-instance scaling ceiling.** Live match state lives in in-memory
  singletons (`InMemoryQuizSessionManager`, `MatchOrchestrator`), so the backend
  can't be horizontally scaled and a deploy/restart drops in-flight matches.
  Acceptable at current scale. *Path when needed:* SignalR Redis backplane +
  shared session store; move uploads to object storage.
- **P3 — Frontend dev-dependency vulnerabilities.** The npm advisories are all in
  `devDependencies` (storybook / vitest tooling) and never ship in the production
  bundle. Clearing them needs a deliberate major storybook/vitest upgrade, which
  is breaking — do it as its own task, not under time pressure.

## Auth enhancements

Detailed in [authentication.md](authentication.md) "Recommended improvements":
refresh-token reuse detection, "log out everywhere", a stale-token cleanup job,
and tightening `ClockSkew`. All **P3**.


# Quiz full error

When an extra person tries to enter a quiz room after the max amount of people it doesn't specify the reason
the app didn't allow for them to join.

# Start another quiz game

The app throws this error "An unexpected error occurred invoking 'StartMatch' on the server. HubException: The match has already started."
after the first quiz game ended and the host tries to start another one.

## Quiz editing (2026-07-02 — see docs/quiz-editing.md)

- ~~**P1 — Editing a played quiz threw an FK violation / edits leaked into live games.**~~
  **Fixed (2026-07-02).** `UpdateQuizAsync` used to delete every `QuizQuestion` row and
  re-insert — but `UserAnswer.QuizQuestionId` / `QuizSession.CurrentQuizQuestionId` FK
  those rows with `Restrict`, so any quiz that had ever been played could not be edited
  at all; and sessions re-read the question list live, so an edit changed an in-flight
  player's game. Replaced with copy-on-write version ranges on `QuizQuestion` plus a
  `QuizVersion` pin on `QuizSession`. Full design in `docs/quiz-editing.md`.
  → `QuizService.UpdateQuizAsync`, `QuizQuestionVersioning`, `QuizSessionService`

- ~~**P2 — Migration not yet generated.**~~ **Fixed (2026-07-02).** Ran
  `dotnet ef migrations add QuizEditingVersioning` and `update-database` against
  the dev database — `QuizSessions.QuizVersion` backfilled from each quiz's
  current `Version`, `QuizQuestions.CreatedInVersion` backfilled from the
  column default (0) to 1. Migration applied cleanly, no errors.
  → `OxygenBackend/QuizAPI/Migrations/20260702170817_QuizEditingVersioning.cs`

- **P3 — Question *content* is not versioned.** Session pinning freezes a quiz's
  question line-up, order, points and time limits — but `QuestionBase` rows (text,
  answer options, correct answers) are shared across quizzes and unversioned. Editing a
  question's content through the question editor still leaks into in-flight sessions
  and rewrites history's view of what was asked. Fine for typo fixes; wrong if the
  correct answer changes mid-game. Would need content snapshots (or blocking content
  edits for questions in active sessions) — decide before it matters.

- **P3 — Retired join rows keep granting question visibility.** The `QuestionBase`
  discovery filter's "in a quiz you can see" clause doesn't distinguish live from
  retired `QuizQuestion` rows. Deliberate for now: sessions pinned to old versions and
  answer-history reads must still load those questions. Side effect: a private question
  removed from a public quiz remains discoverable through that old membership.

- **P3 — Publish/Unpublish button on the quiz detail page is still disabled**
  ("Feature not implemented") even though `PATCH /api/quiz/{id}/status` exists and the
  edit form can change status. Wire it to the endpoint when in the area.
  → `src/pages/Dashboard/Pages/Quiz/Quiz.tsx`