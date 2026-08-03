# Known Issues & Deferred Improvements

A running backlog of things worth fixing **eventually** but that are **not active
threats or blockers** — so they don't get lost, and so day-to-day work can stay
focused on what matters. When you spot a similar "should fix someday, not now"
item, add it here instead of letting it float.

**Priority key**

- **P2** — address before / around a public production launch.
- **P3** — cleanup / nice-to-have; do it when you're in the area.

Auth-specific enhancements are tracked in [authentication.md](../auth/authentication.md)
("Recommended improvements"); the security-review status lives in
[handoff.md](../handoff.md). This file is the catch-all index.

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
  Part of the quiz-visibility rework — see `docs/quiz/quiz-visibility.md`.
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
  model, and lifecycle in [`guest-play.md`](../auth/guest-play.md).
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
- ~~**P2 — Login form shipped baked-in admin credentials.**~~ **Fixed (2026-07-04).**
  `LoginForm` initialized its state with a real admin email
  (`kaloti.avdiaj@gmail.com`) and the password `admin`, which were compiled into
  the **public** production JS bundle — exposing the admin email and strongly
  implying the admin password. Reset both to empty strings. **Follow-up: change the
  seeded admin password** if it is still `admin` (that pair was publicly visible
  until this deployed). → `src/pages/UserRelated/Login/LoginForm.tsx`
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
  _Fix:_ consolidate on one allow-list/service.
  → `OxygenBackend/QuizAPI/Controllers/Image/ImageUploadController.cs`
- **P3 — Speed-bonus latency credit is a fixed 2s a client can under-report into.**
  Scoring trusts a client-reported think time (`ClientElapsedMs`) when it's within
  `MaxLatencyCreditSeconds` of the server's own window — see
  [quiz-grading.md](../quiz/quiz-grading.md#latency-compensated-timing). This is a
  deliberate trade (it stops ping from deciding close matches, and the fallback on
  any failed check is the server window, so a bad report can never _help_), but a
  tampered client can still shave up to the full credit off its time: `2 × 500 /
timeLimit` points, i.e. ~33 pts on a 30s question but ~100 pts (10% of base) on a
  10s one — the fixed credit is proportionally largest exactly where matches are
  tightest. Changing the _client clock_ does nothing (the value is a monotonic
  `performance.now()` delta, never a timestamp), and timeouts/correctness are
  untouched by it.
  _Fix options, cheapest first:_ (1) lower `MaxLatencyCreditSeconds` — config-only,
  no redeploy; (2) scale it against the question, `min(2s, 10% of timeLimit)`;
  (3) the principled one — cap the credit at the connection's _measured_ RTT
  (SignalR already tracks ping) instead of a constant. Consider (3) before any
  competitive ladder or public leaderboard ships.
  → `OxygenBackend/QuizAPI/Services/Scoring/QuizTiming.cs`,
  `Controllers/Quizzes/Services/QuizSessionServices/QuizSessionOptions.cs`

## Code quality / cleanup

- **P3 — Multiplayer & singleplayer gameplay UIs diverged (being unified).**
  The live multiplayer match screen (`MultiplayerGame.tsx`) was built with its
  own bespoke question/answer markup (`QuestionPanel` + `AnswerInput`), visually
  unlike the singleplayer experience (`QuestionDisplay` + the per-type answer
  components, `QuizTimer`, `QuestionMedia`). They drift independently and a
  styling change to one silently skips the other.
  _In progress (2026-06-22):_ the multiplayer **question screen** now reuses the
  singleplayer leaf components via an adapter
  (`MultiplayerQuestionView`) + a shared `QuestionCard`. Remaining divergence is
  the inherently multiplayer-only phases (pre-match countdown, between-question
  reveal/scoreboard, final results) — those have no singleplayer equivalent, so
  they stay multiplayer-specific; only their theming should be kept in line.
  _Redesigned (2026-07-30):_ those multiplayer-only phases (countdown, reveal,
  final results) got a full visual pass — borders removed, a shared
  `FloatingAvatarCluster` component now shows live per-player state (idle /
  submitted / correct / incorrect) across the countdown, question, and reveal
  phases with submission toasts, and the results screen spotlights the winner's
  avatar instead of a generic trophy. This is expected, intentional divergence
  per the note above (multiplayer-only phases, theming-only alignment) — see
  `src/pages/Quiz/Multiplayer/components/game/floating-avatar-cluster.tsx` and
  the `MultiplayerGame.stories.tsx` Storybook coverage for the current spec.
  → `src/pages/Quiz/Multiplayer/components/game/`,
  `src/pages/Quiz/Sessions/components/quiz-taking-process/`
- ~~**P1 — Questions could not be selected from the public pool.**~~ **Fixed (2026-07-31).**
  Every checkbox in the "Select Questions from Pool" dialog rendered disabled, so the manual quiz
  builder could not reuse an existing question at all — only newly authored ones.
  `CommonSelectQuestionCard` gates selection on the quiz context's `isQuestionModalOpen`
  (`disabled={finalSelectionDisabled || !isQuestionModalOpen}`), and that flag was only ever set
  by `SelectQuestionComponent`'s internal `handleOpen`. When the trigger moved into the "add
  question" Popover, the dialog became **controlled** — `create-quiz.tsx` renders it with
  `open={isPoolOpen}` and the menu item calls `setIsPoolOpen(true)` directly, which never reaches
  `handleOpen`. In that path the component renders no trigger of its own, so the flag stayed
  `false`: dialog open, everything un-selectable, `cursor-not-allowed` on every row.
  Fixed by syncing the context flag to the dialog's actual visibility with an effect on `isOpen`,
  rather than to the act of clicking a trigger, so the controlled and uncontrolled paths behave
  identically.
  → `src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/components/question-select/question-select.tsx`
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
  fields, because the service maps the just-created entity _before_ EF loads its
  navigation properties. (The `GET` detail endpoints return them fully populated,
  so it's cosmetic.) _Fix:_ reload the entity with includes before mapping.
  → `QuizService.CreateQuizAsync`, `QuestionCategoriesController.PostQuestionCategory`
- **P3 — Quiz delete with sessions → 500.** Deleting a quiz that already has
  sessions/answers throws an FK error surfaced as a generic 500 instead of a
  friendly 409 ("can't delete a quiz that has been played").
  → `QuizService.DeleteQuizAsync`
- **P3 — Validation messages thrown as `InvalidOperationException` never reach the user.**
  `GlobalExceptionHandler` maps only the `AppException` family to real status codes; everything
  else falls through to **500 "An unexpected error occurred."** with the message deliberately
  withheld. Several services throw `InvalidOperationException` for what are plainly user-facing
  validation failures — e.g. `"At least one answer option must be marked as correct."`
  (`QuestionService`) and the AI import's `"One or more selected questions do not exist."`
  (`QuizService`) — so the user sees a generic 500 and the actual reason is only in the server log.
  This is the same defect class as the multiplayer join errors fixed on 2026-07-31.
  _Fix:_ audit those throw sites and use `AppValidationException` (→ 400) where the message is
  meant for the caller. Found while adding the classification checks, which use the right type.
  → `QuizAPI/Middleware/GlobalExceptionHandler.cs`, `QuestionService`, `QuizService`
- **P3 — `GET /api/Roles` returns full `Role` entities.** The admin role picker
  (`change-user-role.tsx` → `useRoles`) only needs `{ id, name }`, but the endpoint
  serialises whole `Role` rows (incl. `ConcurrencyStamp` and empty nav collections).
  Harmless today — no navigations are loaded, so there's no serialization cycle or
  permission leak — but a small `RoleDTO` projection would be a tidier, less
  over-exposed contract now that non-SuperAdmins can read it. See
  [`docs/auth/user-role-management.md`](../auth/user-role-management.md).
  → `OxygenBackend/QuizAPI/Controllers/Roles/RolesController.cs`
- **P3 — Build warnings.** ~130 compiler warnings, mostly nullable-reference and
  a couple of duplicate `using` directives (`Program.cs` → `System.Text`;
  `TotalsController.cs` → `QuizAPI.Models`). Chip away incrementally.
- **P3 — `!` on EF navigations can crash after the FK is cleared.** When a
  tracked entity's foreign key is set to `null` and `SaveChanges` runs, EF
  relationship fixup also nulls the matching navigation property. So any
  `session.CurrentQuizQuestion!.Question`-style read _after_ the question is
  cleared NREs at runtime — the `!` only silences the compiler, it doesn't guard
  anything. One instance (in `BuildResultDto`, on Incorrect/TimedOut answers) is
  fixed by capturing the question before `ClearCurrentQuestion`, but the
  null-forgiving pattern recurs across the quiz-session services. _Fix:_ audit
  for `!` on EF navigations that are dereferenced after a clear/`SaveChanges`,
  and capture the reference before mutating the FK (or null-check instead of `!`).
  → `OxygenBackend/QuizAPI/Controllers/Quizzes/Services/QuizSessionServices/` (esp.
  `SubmitAnswerService`, `QuizSessionService`, `AbandonmentService`)

## Seed / reference data

- **P3 — Only a small amount of reference data ships, and none of it is seeded.** The
  categories / difficulties / languages that every question and quiz depend on are provided as
  **importable starter files** only (`sample-data/reference-data/` — 24 categories, 6 difficulties,
  4 languages), brought in through the admin Data Import UI. A fresh instance therefore starts with
  an essentially empty set of these lookups until someone imports them. The `DbSeeder` seeds roles,
  permissions, and a default admin, but deliberately **not** this catalogue data. _Options for later:_
  grow the starter files, and/or promote a curated baseline (e.g. the core categories + the six
  difficulty levels) into `DbSeeder` so a brand-new deployment has a sensible catalogue with no manual
  import step. Keep the colour palettes (see `sample-data/reference-data/README.md`) if seeding
  categories, so the quiz-select cards stay visually distinct.
  → `sample-data/reference-data/`, `OxygenBackend/QuizAPI/Services/DbSeeder.cs`

## Repo hygiene

- ~~**P2 — Committed build artifacts.**~~ **Fixed.** Untracked the
  recursively-nested `publish/` tree (~355 files) and added it to `.gitignore`.
  It contained stale copies of the JWT key from before it was rotated
  (`750dd69`); the key is no longer live, and the decision was made to keep
  the old commits as-is (no history rewrite) and rely on making the repo
  private at publish time instead of rewriting shared git history.
- **P3 — Tracked `.env` files.** `.env.production` / `.env.development` are
  tracked despite being listed in `.gitignore`. Only URLs today, but the pattern
  risks leaking a future secret. _Fix:_ `git rm --cached` them.
- **P2 — Private keys committed to the (public) repo.** `certs/` is tracked and
  contains mkcert **local-dev** material, including private keys:
  `create-ca-key.pem` (the mkcert root CA key) and `create-cert-key.pem`. These
  only cover `localhost` dev HTTPS — **not** the Cloudflare Origin cert, which
  lives only on the VPS at `/etc/ssl/cloudflare/` and is _not_ in git. Limited
  blast radius (the CA is only trusted on the dev machine that installed it), but
  a private key must not sit in a public repo. _Fix:_ `git rm -r --cached certs/`,
  add `certs/` to `.gitignore`; then **rotate the mkcert CA** (`mkcert -uninstall`
  → regenerate → recreate localhost certs) so the already-in-history key is
  worthless without a history rewrite. → `certs/`
- **P3 — Build artifacts tracked again.** `bin/` and `publish/` trees are back
  under source control (e.g. `OxygenBackend/QuizAPI.Tests/bin/…`,
  `OxygenBackend/QuizAPI/publish/publish/…`), despite the earlier cleanup. No
  secrets in them (config comes from env), but it's repo bloat. _Fix:_ untrack and
  gitignore `**/bin/`, `**/obj/`, `**/publish/`.
- **P3 — CRLF/LF line-ending churn on some frontend files.** `src/lib/Api-client.ts`,
  `src/context/multiplayer-context.tsx`, and
  `src/features/notifications/components/use-notification-hub.ts` show whole-file
  diffs (hundreds of lines) even when only a couple of lines changed, because their
  line endings flip between CRLF and LF. Content is identical; the diffs are just
  noise (and can hide the real change in review). _Fix:_ add a `.gitattributes` with
  `* text=auto eol=lf`, then renormalize once (`git add --renormalize .`).

## Operations / deployment

- ~~**P2 — Frontend deploys never activated (stale bundle served).**~~ **Root-caused + fixed
  (2026-07-04).** Every `wrangler deploy` uploaded the new assets but then **errored at the final step**
  — `wrangler.jsonc` declared no `routes` and the Worker had no `*.workers.dev` subdomain, so wrangler
  had "nowhere to publish" and aborted before promoting the new version. Result: the fixed bundle was
  uploaded but the **old bundle kept being served**, so production `oxygenquiz.com` still called
  `https://localhost:7153` (→ `ERR_CONNECTION_REFUSED` / CORS) even though the committed code and
  `.env.production` were correct. The site stayed reachable the whole time because the **custom-domain
  binding** (added via the dashboard) serves the last good assets independently of the failing deploy
  step. _Fix applied:_ added `workers_dev: false` + `custom_domain` `routes` for `oxygenquiz.com` and
  `www.oxygenquiz.com` to `wrangler.jsonc`, so `wrangler deploy` (and the Git build) now finish and
  promote the new version. → `wrangler.jsonc`
  - **Regressed then re-fixed (2026-07-05).** The `custom_domain` routes above worked for the first
    deploy but broke every deploy after: because the domains already existed, wrangler's re-assertion
    (`PUT .../workers/scripts/oxygenquiz/domains/records` with `replace_state=true`) returned **409
    Conflict**, aborting with "Some triggers failed to deploy" / "No targets deployed" — so the old
    bundle kept serving again. Confirmed via `WRANGLER_LOG=debug` (the 409 is otherwise hidden behind a
    generic "a request failed"). It is **not** a permissions issue — it fails the same way with a
    full-rights local login. _Fix:_ stop wrangler from managing the domains — **removed the `routes`
    block** and set **`workers_dev: true`**. The domains stay attached in the **dashboard** (which serves
    the latest promoted deploy), and the workers.dev URL is the target that lets wrangler promote each
    new version. → `wrangler.jsonc`
  - **Still worth doing:** pick **one** deploy path (Git-connected build _or_ manual `wrangler`, not
    both racing); always `npm run build` before deploying (the API URL is baked in at build time); after
    a deploy, confirm the newest version is **Active** under Workers & Pages → oxygenquiz → Deployments
    and hard-refresh (Ctrl+Shift+R).
- **P3 — Stale CORS origins in `appsettings.Production.json`.** Still lists the old
  AWS hosts (`*.cloudfront.net`, `*.amplifyapp.com`) instead of
  `https://oxygenquiz.com`. Prod works because the compose file injects
  `Cors__AllowedOrigins` via env vars at runtime, but the committed file is
  misleading. _Fix:_ update it to the real domain (or delete the key and rely on
  the env var). → `OxygenBackend/QuizAPI/appsettings.Production.json`
- **P2 — EF migrations run at startup.** `context.Database.MigrateAsync()` runs
  on boot; with more than one instance starting together this races. Only matters
  once you scale past a single instance. _Fix:_ run migrations as a one-off step
  in the deploy pipeline. → `OxygenBackend/QuizAPI/Program.cs`
- **P3 — Single-instance scaling ceiling.** Live match state lives in in-memory
  singletons (`InMemoryQuizSessionManager`, `MatchOrchestrator`), so the backend
  can't be horizontally scaled and a deploy/restart drops in-flight matches.
  Acceptable at current scale. _Path when needed:_ SignalR Redis backplane +
  shared session store; move uploads to object storage.
- **P3 — Frontend dev-dependency vulnerabilities.** The npm advisories are all in
  `devDependencies` (storybook / vitest tooling) and never ship in the production
  bundle. Clearing them needs a deliberate major storybook/vitest upgrade, which
  is breaking — do it as its own task, not under time pressure.

## Multiplayer / Game State

- ~~**P2 — Clicking a header link during a match froze the question timer.**~~ **Fixed
  (2026-08-02).** Three faults in a line, none of which looks like a timer bug on its own.
  `useNavigationGuard` is armed for the whole session, but `<LeaveLobbyDialog>` was rendered only
  inside `<LobbyPageView>` — and `MultiplayerLobbyPage` early-returns `<MultiplayerGame>` before it.
  So mid-match a blocked navigation showed **nothing** and left the blocker stuck in `blocked` with
  no reachable `proceed()`/`reset()`. Each further click minted a new blocker object and re-rendered
  the game subtree; `<QuizTimer onTimeUp={() => setTimedOut(true)}>` handed it a fresh callback
  identity, which sat in the countdown effect's dependency list, so the effect tore down its
  interval and **re-anchored the deadline to `now + <rounded display value>`** every time. Clicking
  faster than the 250ms interval meant it never ticked at all, while the server ran the question out
  and scored it unanswered. Fixed at all three layers — dialog rendered in both branches (with
  match-specific copy), call site memoised, and the timer's effect reduced to primitive
  dependencies with anchoring allowed only on a new question or a resume.
  → `quiz-timer.tsx`, `MultiplayerLobbyPage.tsx`, `multiplayer-question-view.tsx`,
  `leave-lobby-dialog.tsx`, [`quiz-timer.md`](../quiz/quiz-timer.md)
- ~~**P3 — A 30s question could open at 32 or 34 seconds.**~~ **Fixed (2026-08-02).** The server
  sends `QuestionDeadlineUtc` as an absolute timestamp and the client computed
  `deadline − Date.now()` — a subtraction that only means anything if the two machines agree on the
  time. A phone with a drifted clock read the difference as free seconds. `useMatch` now derives the
  offset from the same event (`deadline − limit` *is* the server's clock at send), re-measured per
  question so an NTP correction mid-match can't leave a stale value, and the remaining time is
  clamped to the question's limit as a ceiling. Latency folds into the offset in the player's
  favour, which is the safe direction — the server's own deadline check is the authority.
  → `use-match.ts`, `multiplayer-question-view.tsx`, [`quiz-timer.md`](../quiz/quiz-timer.md)
- **P3 — Navigating away mid-match doesn't leave the session.** The nav-guard dialog's confirm calls
  `blocker.proceed()` and nothing else, so the player navigates away while the server still counts
  them as a participant for the round. Today the round simply ends when the deadline passes and they
  score zero, which is survivable; a `LeaveSession` on confirm would end the round as soon as the
  remaining players have answered. Same gap existed before the dialog was reachable mid-match — it's
  just visible now.
- ~~**P3 — New joiners could read chat from before they arrived.**~~ **Fixed (2026-07-31).**
  `JoinSession` replayed the whole 50-message buffer to every caller. Now
  `Participant.FirstJoinedAt` stamps the first join and `GetMessagesSinceJoinAsync` filters the
  catch-up to messages at or after it. The stamp is deliberately not refreshed on rejoin, so a
  refresh or reconnect keeps the history it already had.
  → `QuizHub.JoinSession`, `InMemoryQuizSessionManager`,
  [`multiplayer.md`](../quiz/multiplayer.md#45-chat)
- ~~**P2 — "Accept partial answers" did nothing.**~~ **Fixed (2026-07-31).** The quiz builder
  renders a switch promising "Correct if the answer is contained in what they type — 'the Eiffel
  Tower' matches 'Eiffel'". `AllowPartialMatch` was persisted, round-tripped through the DTOs and
  the CSV import, and **read by no grader at all** — the setting was inert, so authors were
  configuring behaviour that never happened and players were marked wrong for answers the UI said
  would be accepted. Also: neither grader trimmed, so `" Paris"` was graded wrong, and the matching
  logic was duplicated between `AnswerGradingService` and `TestQuestionService`, meaning "test this
  question" could disagree with playing it. All three fixed by extracting
  `Services/Grading/TypeTheAnswerMatcher.cs` as the single source of truth, with unit tests.
  _Second pass, same day:_ the first implementation used raw `string.Contains`, which matched the
  builder's original wording but had no word boundaries — it accepted `"concatenate"` for `"cat"`,
  `"Bart"` for `"art"` and `"13"` for `"3"`, making short answers guessable by typing a long enough
  sentence. Replaced with **whole-word containment** (contiguous token run), and **normalisation**
  was split out as an always-on step rather than something bundled into the toggle: accents,
  punctuation, collapsed whitespace and a leading article are now forgiven on every typed answer,
  no toggle. The builder's helper text was updated to match. Two limits are documented rather than
  fixed: containment can't reject a negation (`"not Paris"` contains `"Paris"`), and space-less
  scripts (CJK) fall back to substring because word boundaries don't apply.
  _Third pass (2026-08-02):_ that space-less-script fallback was gated on "both sides are a single
  token", which is true of any one-word answer against a one-word submission — so single-word
  expected answers quietly reverted to raw substring and the `"cat"`/`"concatenate"`, `"one"`/
  `"money"` and `"3"`/`"13"` cases came straight back. `"art"`/`"Bart Simpson"` kept passing only
  because that submission is two words, which is why the tests failed 3-of-4 rather than 4-of-4. The
  fallback is now gated on the expected answer actually being written in a space-less script
  (Han, kana, Thai, Lao, Khmer, Myanmar).
  → `Services/Grading/TypeTheAnswerMatcher.cs`, `QuizAPI.Tests/Grading/TypeTheAnswerMatcherTests.cs`,
  `type-the-asnwer-question-form.tsx`,
  [`typed-answer-matching.md`](../quiz/typed-answer-matching.md)
- **P3 — No typo tolerance on typed answers.** `"parid"` for `"paris"` scores zero. Under a timer
  this punishes motor error rather than ignorance. _Not implemented — needs a decision, since it
  changes what counts as correct._ Proposal: Damerau-Levenshtein (models transpositions, which
  plain Levenshtein misses) with a length-scaled budget (≤4 chars exact, 5–8 → 1, 9+ → 2), skipped
  for numeric answers, mutually exclusive with `IsCaseSensitive` and `AllowPartialMatch`, and
  **per-question opt-in defaulting to off** so no existing quiz changes behaviour. Full reasoning,
  rejected alternatives (Soundex, trigram, Jaro-Winkler) and risks:
  [`proposals/typed-answer-typo-tolerance.md`](../proposals/typed-answer-typo-tolerance.md).
- **P3 — Multi-select is all-or-nothing; 2-of-3 scores zero.** A player who knows 2 of 3 correct
  options scores the same as one who knows none. _Contemplation only, nothing decided._ The blocker
  isn't the arithmetic — it's that `IsCorrect` is a `bool` from `DetermineCorrectnessAsync` through
  `QuizScoring`, `UserAnswer`, `PlayerRoundResult` and both results UIs, plus the historical
  comparability of existing stats. Schemes, costs and the open questions (does partial credit earn
  the speed bonus? what does the results screen show? what counts as "correct" for stats?):
  [`proposals/partial-credit.md`](../proposals/partial-credit.md).

- ~~**P3 — Lobby full error lacks specific UI feedback.**~~ **Fixed (2026-07-31).** The earlier
  note here was itself wrong: the join flow never surfaced `"This lobby is full."` at all.
  `AddParticipantAsync` threw `InvalidOperationException`, and SignalR only relays `HubException`
  when `EnableDetailedErrors` is off — so the browser got "An unexpected error occurred", and
  `multiplayer-context.tsx` then discarded that too in favour of a hardcoded
  `"Failed to join session. The room may not exist."`. **A full lobby was reported as a
  nonexistent one.** Fixed end to end: `SessionJoinException` carries a `JoinFailureReason`
  (`not-found` / `full`), `QuizHub.JoinSession` rethrows it as `HubException`, and the client
  unwraps SignalR's prefix instead of overwriting the message.
  _Same change:_ a mistyped code no longer strands the player on the lobby route. `CheckSession`
  lets `JoinLobbyDialog` verify before navigating, and the lobby page's `JoinForm` fallback — which
  a stale invite link still reaches — leads with the reason and a way back to the menu instead of
  presenting a second, bare code form. `Groups.AddToGroupAsync` also moved after the participant
  add, so a rejected joiner no longer stays subscribed to the group.
  → `OxygenBackend/QuizAPI/Hubs/QuizHub.cs`, `.../InMemoryQuizSessionManager.cs`,
  `src/context/multiplayer-context.tsx`, `src/pages/Quiz/Multiplayer/components/join-lobby-dialog.tsx`,
  `.../components/lobby/join-form.tsx`, [`multiplayer-join.md`](../quiz/multiplayer-join.md)
- ~~**P2 — Host cannot start another match after the first one ends.**~~ **Fixed (2026-07-31).**
  `MultiplayerSession.QuizState` only ever moved forward (`Lobby → … → QuizEnded`) and nothing put
  it back, so `StartMatchAsync`'s `!= QuizState.Lobby` guard rejected every match after the first —
  one game per lobby, forever. Added `IMatchOrchestrator.ResetToLobbyAsync`, which returns the
  session to `Lobby` and drops the finished match's runtime state (questions, scores, round
  answers) while keeping `SelectedQuiz` so a rematch is one click. It runs from `RunMatchAsync`'s
  **`finally`**, so a match that crashes or is cancelled mid-question also releases the lobby
  instead of stranding it in `QuestionActive`. The "already started" guard is now **loop liveness**
  (`MatchCts != null`) rather than the phase enum — using a forward-only phase as a mutex was the
  root mistake. Ready flags are cleared on reset (broadcast as `PlayerReadyChanged`) so a rematch
  needs a fresh opt-in. No frontend change was needed. See
  [`multiplayer.md`](../quiz/multiplayer.md#3-session-lifecycle).
  → `OxygenBackend/QuizAPI/Services/QuizSessionServices/MatchOrchestrator.cs`, `IMatchOrchestrator.cs`

## AI quiz creation (2026-07-17 — see docs/quiz/ai-quiz-architecture.md)

- ~~**P2 — Orphan questions if quiz-create fails (AI flow).**~~ **Fixed (2026-07-17).**
  The AI import used to create each question with its own committed request, then create
  the quiz separately — so a failure after the questions were created left Private,
  quiz-less "orphan" rows. Added a transactional `POST /api/quiz/ai-import` that creates
  the questions, the quiz, and the join rows in a **single** transaction (reusing the
  `BeginTransactionAsync` pattern already in `CreateQuizAsync`), so a failure rolls back
  everything. The wizard now calls this one endpoint instead of the per-question loop.
  → `QuizService.CreateAiQuizAsync`, `DTOs/Quiz/AiQuizImportCM.cs`,
  `QuizzesController` (`ai-import`), `src/pages/Dashboard/Pages/Quiz/api/create-ai-quiz.ts`
- ~~**P3 — Manual flow silently orphaned questions on quiz-create failure.**~~
  **Improved (2026-07-17).** The manual builder still creates questions first (this is
  _intentional_ — a user's hand-authored questions are worth keeping if the quiz save
  fails, and can be reused). The only defect was that the outcome was silent. On failure
  after questions were created, the user is now told their questions were saved to their
  bank and can be reused, instead of a generic error.
  → `src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/create-quiz.tsx`
  _Revisited (2026-07-31):_ the message covers a failure of the **quiz** call only. A failure
  inside the question loop itself is still silent — see the P2 immediately below.
- **P2 — Partial failure inside the manual question loop leaves untracked orphans.**
  `handleQuizSubmit` fires the new questions through `Promise.all`. That rejects on the **first**
  rejection, but the other in-flight POSTs are not cancelled and keep committing — so a failure on
  question 3 of 20 can leave anywhere from 0 to 19 orphan questions, with no record of which, no
  cleanup, and a generic "Failed to create quiz" from the outer `catch`. The "your questions were
  saved" message does **not** fire here, because that branch only runs when the quiz call fails.
  Distinct from the intentional non-atomicity above: that one is a considered trade-off, this is
  an unhandled case.
  _Newly reachable:_ the "category/language can't be Unspecified" rule (2026-07-31) means a quiz
  with an Unspecified category now fails **every** question POST at once, turning the most likely
  mistake into a partial-failure storm.
  _How to fix (cheap, frontend-only):_ swap `Promise.all` for `Promise.allSettled`; if any question
  failed, stop **before** creating the quiz and report which ones rather than proceeding. Pair it
  with a pre-flight check of the quiz's own category/language, which is knowable up front and is
  now the likeliest cause of a mass failure.
  → `src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/create-quiz.tsx` (`handleQuizSubmit`)
- **P3 — Manual quiz create is N+1 requests across two transactions.** A 20-question quiz is 21
  requests: 20 concurrent question POSTs to the shared per-type endpoints, then one quiz POST.
  The two halves are in different transactions, which is what makes the orphan cases above
  possible at all, and the request count scales with quiz size.
  _How to fix:_ generalise the **existing** atomic AI path rather than inventing anything — the
  transactional `POST /api/quiz/ai-import` already creates a quiz, its new questions and the join
  rows in one transaction, and already handles the mixed "new questions inline, existing ones by
  id" case the manual builder needs. Widen its contract (it isn't AI-specific), move
  category/language inheritance into the service beside the check already there, and point
  `handleQuizSubmit`'s non-AI branch at it. Requires deciding explicitly what happens to authored
  questions on failure — atomic means rolled back, which contradicts today's "we saved your
  questions" behaviour, so either accept that or make saving-to-bank a deliberate affordance.
  Care needed around edit mode's versioning rules and image association.
  Full write-up: [`proposals/quiz-creation-atomicity.md`](../proposals/quiz-creation-atomicity.md).
  → `QuizService.CreateAiQuizAsync`, `QuizzesController` (`ai-import`),
  `src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/create-quiz.tsx`
- **P3 — Adding a new question type is shotgun surgery.** A 4th question type touches
  ~8 files (`types.ts`, `constants.ts`, the quiz context's `getValidationSchema`, three
  create mutations, the display cards, plus the AI feature's `prompt.ts` + `parse-ai-output.ts`),
  and mirror work on the backend (`QuestionDTOs.cs`, `EntityMappers.cs`, `QuestionService`,
  DbSets). This is a _pre-existing_ coupling the AI feature widened by two files. Not worth
  fixing at the current type count, but the target shape is documented for when it is:
  a per-type **registry** so a new type is one module. See
  [`ai-quiz-architecture.md`](../quiz/ai-quiz-architecture.md) §12.
- ~~**P2 — The LLM chooses `allowPartialMatch`, with no guidance and no review prompt.**~~
  **Fixed (2026-07-31).** `prompt.ts` asked the model for `"allowPartialMatch": boolean` on every
  TypeTheAnswer question and `parse-ai-output.ts` passed it through unchanged. Unlike
  `isCaseSensitive`, which the prompt annotates "almost always false", there was **no rule telling
  the model when partial matching is appropriate** — so the choice was arbitrary. Harmless while the
  flag was inert; once it started grading (same day), an unguided `true` on a short answer silently
  produced a question a player could pass by typing a sentence containing the word, with nothing in
  the review step drawing attention to it.
  Fixed by removing the field from the prompt and hard-coding `allowPartialMatch: false` in the
  parser. `.passthrough()` means a model that emits it anyway isn't an error — the value is ignored.
  The author opts in during review, where they can see the answer it applies to. `isCaseSensitive`
  is deliberately still model-chosen: it's a property of the content, the prompt gives it a default,
  and getting it wrong makes a question *harder* to guess, not easier.
  → `src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/prompt.ts`, `parse-ai-output.ts`,
  [`typed-answer-matching.md`](../quiz/typed-answer-matching.md)
- **P3 — Prompt logic will duplicate in C# at Phase 2.** `buildPrompt` is TS-only; the
  planned server-side (hosted-API) generator would restate it. When Phase 2 lands, make the
  backend the prompt authority (expose it via an endpoint the copy button also fetches) so
  there is one copy. → `src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/prompt.ts`
- **P3 — AI parser restates some validation rules.** `parse-ai-output.ts` re-encodes a few
  rules already in the `create*QuestionInputSchema` Zod schemas (kept separate on purpose —
  builder vs API shapes differ, e.g. `acceptableAnswers`). Track as drift risk; unify only
  where shapes align.

## Auth enhancements

Detailed in [authentication.md](../auth/authentication.md) "Recommended improvements":
refresh-token reuse detection, "log out everywhere", a stale-token cleanup job,
and tightening `ClockSkew`. All **P3**.

## Quiz editing (2026-07-02 — see docs/quiz/quiz-editing.md)

- ~~**P1 — Editing a played quiz threw an FK violation / edits leaked into live games.**~~
  **Fixed (2026-07-02).** `UpdateQuizAsync` used to delete every `QuizQuestion` row and
  re-insert — but `UserAnswer.QuizQuestionId` / `QuizSession.CurrentQuizQuestionId` FK
  those rows with `Restrict`, so any quiz that had ever been played could not be edited
  at all; and sessions re-read the question list live, so an edit changed an in-flight
  player's game. Replaced with copy-on-write version ranges on `QuizQuestion` plus a
  `QuizVersion` pin on `QuizSession`. Full design in `docs/quiz/quiz-editing.md`.
  → `QuizService.UpdateQuizAsync`, `QuizQuestionVersioning`, `QuizSessionService`

- ~~**P2 — Migration not yet generated.**~~ **Fixed (2026-07-02).** Ran
  `dotnet ef migrations add QuizEditingVersioning` and `update-database` against
  the dev database — `QuizSessions.QuizVersion` backfilled from each quiz's
  current `Version`, `QuizQuestions.CreatedInVersion` backfilled from the
  column default (0) to 1. Migration applied cleanly, no errors.
  → `OxygenBackend/QuizAPI/Migrations/20260702170817_QuizEditingVersioning.cs`

- **P3 — Question _content_ is not versioned.** Session pinning freezes a quiz's
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
