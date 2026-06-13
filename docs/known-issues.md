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

- **P2 — SVG uploads allowed.** `FileService` permits `.svg`, and uploads are
  served from the app's own origin, so a crafted SVG could execute script if a
  user opens it directly (stored XSS).
  *Fix:* drop `.svg` from the allow-list, or serve uploads from a separate
  domain / with `Content-Disposition: attachment` + a strict CSP.
  → `OxygenBackend/QuizAPI/Controllers/Files/Services/FileService.cs`
- **P2 — Hangfire dashboard has no auth filter.** `app.UseHangfireDashboard("/hangfire")`
  is mapped with no `IDashboardAuthorizationFilter` (the default is local-only,
  but that behaves unpredictably behind a reverse proxy / load balancer).
  *Fix:* add an authorization filter restricting it to admins, or don't map it
  in production.
  → `OxygenBackend/QuizAPI/Program.cs`
- **P2 — Public user-read endpoints leak email.** `GET /api/users/{id}`,
  `GET /api/users/username/{username}`, and `POST /api/users/batch` return the
  full `UserDTO` (including email) with no authentication.
  *Fix:* require auth, or return a slim public profile DTO (no email/permissions).
  → `OxygenBackend/QuizAPI/Controllers/Users/UsersController.cs` (also in [handoff.md](handoff.md))
- **P3 — `AllowedHosts: "*"`.** Set to the real host name(s) in production to
  blunt host-header attacks. → `OxygenBackend/QuizAPI/appsettings.json`
- **P3 — Broad CORS.** The policy uses `AllowAnyHeader` + `AllowAnyMethod` with
  credentials. It's origin-restricted, so low risk, but tighten the header/method
  surface if practical. → `OxygenBackend/QuizAPI/Program.cs`

## Code quality / cleanup

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

## Repo hygiene

- **P2 — Committed build artifacts.** A recursively nested `publish/` tree
  (~355 files) is checked into git, including stale copies of the old (now
  rotated) JWT key. *Fix:* `git rm -r --cached` it, add to `.gitignore`;
  optionally scrub from history.
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
