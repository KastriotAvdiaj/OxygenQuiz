# Testing guide

How testing works in Oxygen Quiz: what exists, how to run it, and the path to follow
when adding more. The suite intentionally starts with the **critical paths** — quiz
grading and authentication — and is built to grow.

---

## 1. The stack

| Layer | Framework | Lives in |
| --- | --- | --- |
| Backend (.NET 8) | xUnit, Moq, EF Core InMemory | `OxygenBackend/QuizAPI.Tests/` |
| Frontend unit | Vitest + Testing Library (jsdom) | `src/**/__tests__/` |
| Frontend visual | Storybook + Chromatic | `src/**/*.stories.tsx` |
| End-to-end | Playwright, real API + PostgreSQL | `e2e/*.spec.ts` — see [`e2e-testing.md`](e2e-testing.md) |

The frontend uses a Vitest **workspace** (`vitest.workspace.ts`) with two projects:

- **`unit`** — fast jsdom tests (configured in `vite.config.ts`). This is the deploy gate.
- **`storybook`** — runs component stories in a real browser via Playwright. Visual /
  interaction coverage, **not** part of the deploy gate.

The end-to-end suite is a separate thing with its own runner (`@playwright/test`, not Vitest),
its own config (`playwright.config.ts`) and its own guide: [`e2e-testing.md`](e2e-testing.md).
Vitest is told to ignore `e2e/` (`vite.config.ts`), since its specs are `*.spec.ts` too.

### What these tools are

If you're new to the .NET testing libraries, here's what each one does. They're separate
tools that each handle one job and plug into each other.

- **xUnit — the test runner.** The framework that actually runs the tests and reports
  pass/fail; it's what `dotnet test` invokes. You write small methods marked `[Fact]`
  (one test) or `[Theory]` (the same test run with several inputs) and make assertions
  like `Assert.Equal(15, points)` — "I expect this to be 15; fail if it isn't." xUnit is
  one of three common .NET choices (alongside NUnit and MSTest); it's the modern default.

- **Moq — fakes a dependency.** Real code rarely works alone. `AuthenticationService`, for
  example, needs a user database, a token generator and an email sender. In a test you
  don't want a real database or to actually send email — you just want to check the *login
  logic*. Moq hands the service pretend ("mock") versions of those collaborators where you
  script the answers ("when asked whether this email exists, say yes"), then you assert the
  service reacts correctly. It lets you test one piece in isolation. Moq returns a completed
  `Task` for any async method you didn't configure, so you only set up the calls that matter.

- **EF Core InMemory — a throwaway fake database.** EF Core is the library the app uses to
  talk to its real PostgreSQL database. "InMemory" is a mode where, instead of a real
  database on a server, EF keeps the data in memory for the duration of a single test and
  then discards it. So the grading tests create a fake question, save it, run the *real*
  grading code against it, and check the score — in milliseconds, with no database to set
  up and nothing left behind. Each test gets its own fresh empty one, so they can't
  interfere with each other.

**Why two fake-database approaches?** It's a judgment call about what's being tested. For
grading, the database queries *are* the logic worth exercising, so we use a real
(in-memory) EF database so those queries actually run (pattern B below). For
authentication, the database is just a collaborator and the decision-making is the
interesting part, so we fake it with Moq (pattern C below).

> Analogy: testing a car's dashboard — **xUnit** is the test bench and checklist, **Moq** is
> plugging in fake sensors you can tell to report "engine hot" on demand, and **EF InMemory**
> is a simulator standing in for the real engine so you don't have to start a real one.

---

## 2. What exists today

### Backend — `OxygenBackend/QuizAPI.Tests`

> **Keep this table complete.** It went from 6 rows to 23 without anyone noticing, which made it
> read as "these are the six things under test" rather than a stale list — the worst failure mode
> for an inventory, because it invites writing a test that already exists and misreads real
> coverage as absent. Add a row in the same change as the file.

| File | Type | Covers |
| --- | --- | --- |
| `Scoring/QuizScoringTests.cs` | Pure unit | Speed bonus, point-system multipliers, the "never below 1" floor, edge cases (no limit, over-time, negative time). |
| `Scoring/QuizTimingTests.cs` | Pure unit | Which elapsed time an answer is scored with — the latency-compensation trust boundary in `QuizTiming.EffectiveElapsed`. Doubles as the spec for what a client can and cannot make the server believe. See [`quiz-grading.md`](../quiz/quiz-grading.md). |
| `Grading/AnswerGradingServiceTests.cs` | Service + InMemory DB | Right/wrong decisions for every question type (single & multi-select MCQ, true/false, type-the-answer with case sensitivity and acceptable alternatives), the timeout-to-zero override, and unknown-question handling. Typed answers now delegate to `TypeTheAnswerMatcher`, so the fine-grained cases live in the file below and these stay as integration coverage of the wiring. |
| `Grading/TypeTheAnswerMatcherTests.cs` | Pure unit | What counts as a correct typed answer: normalisation (whitespace, accents, punctuation, leading articles), case sensitivity, acceptable alternatives, whole-word partial matching, and the guards that stop an empty submission matching everything. Covers both graders, since the live grader and the question preview share this matcher. See [`typed-answer-matching.md`](../quiz/typed-answer-matching.md). |
| `Associations/DuelRulesTests.cs`, `SoloRulesTests.cs` | Pure unit | The Associations rules engine, one test per rule: a Duel turn opens exactly one Tile then may Guess, a correct Guess keeps the turn but earns no Tile, a wrong Guess / Pass / expiry passes it, the turn clock (and its restart), the endgame including the worked example from [`associations.md`](../quiz/associations.md), three Seats; Solo (D18): no Guess before a Tile, a Tile earns one Guess, a wrong one spends it, a right one earns another at any target, opening instead of guessing, the endgame countdown once every Tile is open; the board deadline, giving up. Every refused move is checked to leave the state untouched. |
| `Associations/AssociationScoringTests.cs` | Pure unit | The scoring table in `associations.md` §4, played through the engine rather than asserted on the formula, under the default settings and under changed ones — which is what proves the numbers are settings. |
| `Associations/ReplayAndRulesTests.cs` | Pure unit + options binding | Replay equals live play and is deterministic; a corrupt log throws instead of being skipped; the same log scores differently under changed rules, which is why games snapshot theirs; snapshots round-trip and old ones default missing settings; invalid settings are reported; `Associations:Rules` binds through the provider. |
| `Associations/AssociationGuessMatcherTests.cs` | Pure unit | A Guess against a solution: Albanian diacritics forgiven (`drite`/`Dritë`, `caj`/`Çaj`), acceptable spellings, case ignored, **no** partial match. The normalisation itself is `TypeTheAnswerMatcherTests`' job. |
| `Associations/AssociationBoardServiceTests.cs` | Service + real repos + InMemory DB | Authoring a board: create writes quiz and whole Board together (and nothing when invalid); the Classic publishing gate applies; board time follows the rules; the edit read is the answer key — owner and admin yes, stranger 404; copy-on-write on content change, none on a metadata-only or trim-only change; stale version is a 409; a Classic quiz can't be updated here; a stored Board maps to an engine key with real tile ids. InMemory doesn't enforce the one-live-Board index — the retire-and-insert ordering was checked on real PostgreSQL (associations.md §8.2). |
| `Associations/AssociationBoardValidatorTests.cs` | Pure unit | What a Board must be to save: 4×4, non-empty, 100-character limit, at most 4 other spellings, board time in range — and every problem reported at once, each naming its Column and Tile. |
| `Associations/AssociationPlayServiceTests.cs` | Service + real repos + InMemory DB + a hand-moved `TimeProvider` | Solo play, each call on a fresh DbContext like a request: start writes session, game, seat, deadline and rules snapshot; starting again resumes; an expired game is settled as TimeUp (score kept) and a new one started; Draft / Unlisted access (and the share token); Classic refused only after access; every move and what it reveals; refused moves record nothing; a move at the deadline doesn't count and ends the game at the deadline; resume before and after the deadline; a running game keeps its rules snapshot when the configuration changes; a stranger gets 404, an admin may read but not move; restart of a running and a finished game, and a refused restart ends nothing; the view's `canOpen` / `canGuess` / endgame fields through a whole board. Not covered: the duplicate-`Seq` 409 — InMemory doesn't enforce unique indexes. See [`associations.md`](../quiz/associations.md) §9. |
| `Associations/AssociationViewSecrecyTests.cs` | Service + InMemory DB, JSON search | Serialises real play responses — a move, a read, a resume, a finished game — and searches the whole JSON for closed Tile texts, unsolved solutions and acceptable spellings. A leaking field added to a view DTO fails here with no new assertion (checked by leaking Tile text). |
| `Associations/AssociationLifecycleTests.cs` | Service + real repos + InMemory DB | Where Board sessions meet Classic machinery: the abandonment deadline is the game's deadline + grace, not zero (checked by removing the branch); bulk ending says TimeUp or Abandoned and replay agrees; discarding a guest session and deleting a session remove the game, its seat and its moves but not the Board. |
| `Associations/AssociationDuelTests.cs` | Pure unit, times passed in | The Duel runner (`AssociationDuel`): only the Seat whose turn it is may act, others and non-players are refused with nothing recorded; a turn opens one Tile then may Guess; wrong Guess and Pass hand over with a fresh clock, a correct one keeps the turn and restarts it; the clock running out records `TurnExpired` and a late move doesn't count; the endgame (and its length as a setting); the Final ends it and the higher score wins, equal is a tie; a forfeit is won by the one still there whatever the score; the game row it builds (seats, first seat, `SeatCount`, snapshot, move log) replays to the same game; the view hides what's closed while playing and reveals the Board — never the other spellings — after. |
| `Multiplayer/AssociationMatchOrchestratorTests.cs` | Loop on its real background task + `FakeTimeProvider` + real session manager, lobby reset and repos on InMemory; SignalR mocked | The Duel in a lobby: exactly 2 players; no second start while running; countdown then board; moves broadcast, wrong Seat refused and nothing broadcast; moves before the board / without a Duel refused; the turn clock expiring at exactly 30s; a finished Duel recorded **once** (match, both sessions, the game with its moves and `SeatCount`) with the results links in `DuelEnded` and the lobby handed back un-readied; forfeit (and during the countdown) recorded with the right winner; an interrupted Duel writes nothing (checked by recording it anyway: the test fails); a rematch opened by the other player; the catch-up view. The first tests of a match loop. |
| `Multiplayer/QuizHubDuelTests.cs` | `QuizHub` via `HubHarness` (clients, groups and caller context mocked) | Picking a Board fills the server's format over the client's; a non-admin host may pick one since the release (it was refused while the format was in preview); `StartMatch` dispatches by format and relays the orchestrator's refusal; the move methods act as the signed-in account and relay the runner's sentence; `DuelState` to someone joining mid-Duel and not otherwise; leaving is `PlayerLeftAsync`. |
| `Multiplayer/QuizHubRejoinTests.cs` | `QuizHub` via `HubHarness` + `FakeTimeProvider` | The reconnect fix's server half: a rejoin moves the participant to the new connection id, is added to the group, gets the catch-up bundle, is **not** announced as a new arrival, and can use the `Context.Items` methods again; a first join is still announced. And the disconnect grace itself: a connection that doesn't come back is removed after 5s (not 4.9), `UserLeft` goes out and a Duel is left; one that rejoins inside the grace keeps its place. |
| `Multiplayer/QuizHubLobbyCapTests.cs` | `QuizHub` via `HubHarness` | The lobby size is clamped by the hub, not just the dialog: `0`, negatives and `1` become 2, `5000` becomes 10, an in-range size is kept; a lobby asked for with `0` still refuses the third player. |
| `Multiplayer/DuelReviewTests.cs` | Real Duel recorded by the orchestrator, then `AssociationPlayService` | Each player reviews the Duel from their own Seat (score, `mySeat`, seats, winner); the review still replays after the opponent deleted their session (`SeatCount`); a Duel session takes no moves over HTTP. |
| `Formats/PreviewFormatAccessTests.cs` | Service + real repo + InMemory DB; controllers with strict mocks | Associations is released (2026-10-08): a player gets the board from the catalogue, search (and its `format` filter), by id and by share link, and reaches the authoring and play services. Until the release these tests pinned the opposite — the board absent from every read and every endpoint a 404 — and the preview mechanism is still there, empty, for the next format. See [`associations.md`](../quiz/associations.md) §0. |
| `Formats/ClassicEntryPointGuardTests.cs` | Service + InMemory DB | Every Classic entry point refuses an Associations quiz — session create (user and guest), Start Fresh, next question, resume, submit, the Classic update (which would otherwise zero the board's time) — each separately, because each fails differently without its guard. Also: a stranger gets the ordinary "not available", never a format hint; the format reaches both DTO projections. See [`associations.md`](../quiz/associations.md) §2. |
| `Auth/AuthenticationServiceTests.cs` | Service + Moq | Duplicate email/username rejected, missing default role rejected, bad credentials rejected, invalid/empty verification tokens rejected, logout no-op. |
| `Auth/NotACommonPasswordTests.cs` | Pure unit | Common/breached + single-repeated-char passwords rejected; strong passphrases pass. |
| `Visibility/QuestionVisibilityFilterTests.cs` | Filter + InMemory DB | Who may load a question: the guest-vs-owner-vs-stranger matrix over the `QuestionBase` global query filter, including the regression that made every public quiz built from newly-authored (`Private`) questions 500 for anonymous visitors, and the inverse guard that a Private question in a **Draft** quiz stays hidden. Asserts on the `Include`d navigation, not just the join row — the row always loaded; it was `Question` that came back null. See [`quiz-visibility.md`](../quiz/quiz-visibility.md). |
| `Visibility/QuizQueryFilterTests.cs` | Filter + InMemory DB | `Quiz`'s only global filter is soft delete. Pins that Draft and Unlisted quizzes are **not** hidden by EF (visibility is each entry point's job), and shows why: a stranger's session on an Unlisted quiz must still load its `Quiz`. Fails if a visibility filter is added back — read [ADR 0019](../adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md) first. |
| `Playing/AnswerOptionOrderTests.cs` | Pure unit + InMemory DB | Answer options are shuffled at serve time, deterministically. Pins the whole positional distribution (not just "not first") and the exact permutation, because the two tempting simplifications — seeded `Random`, `string.GetHashCode()` — pass every behavioural test and break only across a restart or a runtime upgrade. See [`../adr/0006-answer-order-is-shuffled-at-serve-time.md`](../adr/0006-answer-order-is-shuffled-at-serve-time.md). |
| `Playing/MatchReadsTests.cs` | Service + real queries + InMemory DB | The two reads over a recorded match: the player roster, and who may see it. Pins the distinction the answer-row design rests on — `TimedOut` (sat a question out) is not `NotAnswered` (had left) — and the peer rule, the only place in this service where "not yours" still means yes. The negatives are the load-bearing ones: a stranger may not read a match session, and a single-player session is never peer-readable, so the rule cannot widen access to solo play. The Classic match loop that WRITES these rows is still untested — [`../quiz/multiplayer.md`](../quiz/multiplayer.md) §8 says why; the Duel loop is (`AssociationMatchOrchestratorTests`), and its harness is the pattern to copy. |
| `Playing/SessionResumeStateTests.cs` | Projection + InMemory DB | `QuizSessionDto.ResumeState` hands back exactly the question set, in the order, that the resume walk itself iterates. Every test is a way for the two to drift: an answered question or a wrong-version row makes the "Session In Progress" screen promise questions resume won't give. See [`../quiz/session-resume-screen.md`](../quiz/session-resume-screen.md). |
| `Playing/SessionHistoryPagingTests.cs` | Service + InMemory DB | The play-history list. Paging: sessions on a soft-deleted quiz are excluded from both the count and the page (they were counted but dropped — 22 cards on a page of 24), the last page holds exactly the remainder, the history's own page-size cap. Filters: title search, the quiz facets under the catalogue's field names, the computed `status` (abandoned wins over completed), half-open date ranges, `accuracy` vs `totalScore` sort, deterministic tie-breaking, and that no filter widens past the caller's own sessions. InMemory doesn't reproduce the SQL paging push-down or prove the `CASE` translates — both were also checked against Postgres. See [`../quiz/user-stats-history.md`](../quiz/user-stats-history.md). |
| `Playing/SessionAbandonmentTimeoutTests.cs` | Service + InMemory DB | The abandonment check cannot void a session the catch-up walk would have resumed — stated behaviourally (a session at the walk's furthest reach is still resumable) so it survives a refactor of the arithmetic. Also the min()-of-two-caps deadline, and that a never-played session still ages out. See [`../adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md`](../adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md). |
| `Editing/QuizQuestionVersioningTests.cs` | Pure unit | The copy-on-write edit diff never mutates or deletes a live join row — it retires and inserts — so a session pinned to an older quiz version keeps its exact question set, order, points and time limits. See [`../quiz/quiz-editing.md`](../quiz/quiz-editing.md). |
| `Discovery/QuizVarietyOrderingTests.cs` | Pure unit | The catalogue's "variety" ordering interleaves categories, newest of each first, so a new user sees breadth instead of a wall of one category. Plain LINQ, so it runs identically here and in SQL. See [`../quiz/quiz-discovery.md`](../quiz/quiz-discovery.md). |
| `Featured/FeaturedQuizContentTests.cs` | Pure unit over the real embedded file | `Seed/featured-quizzes.json` breaks none of the featured-quiz rules (10 questions, 4 options, no typed answer in Easy/Medium, no true/false in Expert, the per-level time floor, an explanation each), has all 16 keys and no repeated question; each rule caught on a crafted quiz. A bad edit fails here instead of being skipped at startup. See [`../quiz/featured-quizzes.md`](../quiz/featured-quizzes.md) §3. |
| `Featured/FeaturedQuizSeederTests.cs` | Seeder + InMemory DB, real content | A fresh database gets the 16 quizzes, 160 Global questions owned by OxygenQuiz, the baseline lookups with the new palettes, a protected owner. Seed-once (ADR 0026): a second run adds nothing; an existing category keeps its palette and spelling; an edited quiz isn't overwritten; a **soft-deleted** one isn't recreated (checked by dropping `IgnoreQueryFilters`) while a hard-deleted one is; a name clash with a real "oxygenquiz" falls back. |
| `Featured/FeaturedQuizRulesTests.cs` | Service + real repo + InMemory DB | Who can take a featured quiz off the page: an Admin can't delete it or unpublish it — by the status endpoint or the full update — a SuperAdmin can; an Admin gets past the owner check to edit it, a player doesn't; OxygenQuiz's questions are SuperAdmin-only to delete; `GetFeaturedQuizzesAsync` returns only live, Public, featured quizzes to a guest. Each guard was removed once to see its test fail. |
| `Questions/AcceptableAnswerRulesTests.cs` | Pure unit | What `Normalize` stores in the acceptable-answers JSON column. Every write path funnels through it — the per-type endpoints, AI import, CSV import — so this is what ends up persisted. |
| `Stats/UserStatsServiceTests.cs` | Service + InMemory DB | Profile play-stats inclusion rules, all three easy to get wrong and impossible to spot when wrong: guest sessions never count, abandoned sessions don't drag the average down, only graded answers reach accuracy — and Associations plays are left out, so scores stay on one scale. |
| `Users/UserServiceRoleTests.cs` | Service + real repo + InMemory DB | The privilege-escalation rules on "change user role": only a SuperAdmin may grant or remove SuperAdmin, and a protected account's roles can't be changed at all. Also pins the *inverse* of the guard it replaced — demoting the only unprotected SuperAdmin now succeeds — so the removed count-based lockout can't quietly come back. See [`../adr/0011-system-accounts-are-protected-rows.md`](../adr/0011-system-accounts-are-protected-rows.md). |
| `Users/UserServiceDeleteTests.cs` | Service + real repo + InMemory DB | Every cell of the administrative-delete matrix: an Admin may delete plain users only, a SuperAdmin anything unprotected, nobody a protected account or themselves. The load-bearing case is a protected account with **no roles at all** — the guest placeholder sails past the elevated-role check, so protection is the only thing stopping it. Until ADR 0011 the sole check was "is the caller an Admin?", and the deletion it allowed has no undo. |
| `Users/AccountClosureTests.cs` | Service + InMemory DB | Self-service closure: the three states (active / requested / anonymised), that a second request doesn't restart the 30-day clock, that the scrub keeps the row and destroys the person in it, that the sweep is idempotent, and that it skips protected accounts even if the request-time check were bypassed. See [`../auth/account-closure.md`](../auth/account-closure.md). |
| `Auth/AccountClosureLoginTests.cs` | Service + real repo + real closure service + InMemory DB | That signing in during the grace period actually cancels the closure — wiring across three classes, so nothing here is mocked that matters (see pattern E). Its twin test is the safety net: an **admin-deleted** account is also soft-deleted, and must stay locked out despite login's widened lookup. |
| `Users/EmailReservationTests.cs` | Real repo + real closure service + InMemory DB | Who owns an address, as signup sees it: live and closing accounts hold theirs, admin-deleted and anonymised ones don't. Four states in one query, and the query and the column states are written by different classes — a mock would let them drift, which is how a closing account's address came to read as free. |
| `Auth/AccountClosureExternalLoginTests.cs` | Service + real repos + real closure service + InMemory DB | The same claim for Google/Microsoft sign-in, both branches: an already-linked identity, and a first sign-in whose verified email matches a closing password account. It exists because the password-path test above passed while external sign-in still resolved its user through the filtered `GetByIdAsync` — a closing account came back null and a returning Google user was told `Invalid credentials`. The external-login repository is real here too: mocking it hides the bug, because the link row **is** found and it is the user lookup behind it that fails. |
| `Auth/InviteCodeServiceTests.cs` | Service + InMemory DB | Mint-time invite rules, load-bearing one being the escalation guard: a role-granting code is a second way to hand out that role, so an Admin must not be able to mint themselves a SuperAdmin code and walk around the guard on role updates. See [`../auth/invite-code-system.md`](../auth/invite-code-system.md). |
| `Auth/ExternalAuthenticationTests.cs` | Service + Moq + real TokenService | Google/Microsoft sign-in: login-or-link resolution, invite-gated external signup, and the signup-ticket boundary. The provider verifier is mocked (their crypto isn't ours to test); the ticket is a real signed JWT, so tamper rejection and "an access token is NOT a ticket" are asserted against the real implementation. See [`../auth/social-login.md`](../auth/social-login.md). |
| `Auth/PwnedPasswordsCheckerTests.cs` | Pure unit (internals) | The two pure halves of the k-anonymity lookup: how the hash is split, how the response is read. Worth testing because **every way it breaks looks like working** — a case change or a stray `\r` turns "breached" into "no match", which is what a healthy check returns for a good password. See [`../auth/password-policy.md`](../auth/password-policy.md). |
| `Ai/AiConfigurationResolverTests.cs` | Pure unit | The decision table behind "a broken AI configuration switches the feature off, it does not stop the app". Two properties matter more than the cases: no input ever throws, and unavailable implies `Enabled == false`. See [`../adr/0004-ai-misconfiguration-disables-the-feature.md`](../adr/0004-ai-misconfiguration-disables-the-feature.md). |
| `Ai/AiGenerationServiceAvailabilityTests.cs` | Service + Moq | `IsAvailableAsync` agrees with the gates inside `GenerateAsync`. The budget case is the one pinned: it's one `await` a refactor can quietly drop while everything compiles and every other test stays green — and the symptom is a live Generate button that 503s. |
| `Ai/AiJsonExtractorTests.cs` | Pure unit | The server's only look at model output: "is there a usable JSON object in here?" That answer decides whether a retry is worth a second call and whether the user's quota slot is released. Semantic validation is deliberately not here — it lives in `parse-ai-output.ts`. |
| `Ai/AiPromptBuilderTests.cs` | Pure unit | The prompt's invariants, asserted directly rather than golden-matched: no entity ids ever reach the model, questions carry no category or language, the allowed-types and time-limit vocabularies are closed. A leaked primary key here would still generate a fine quiz, which is exactly why it needs a test. |
| `Ai/AiVocabularyTests.cs` | Service + Moq | The seeded "Unspecified" lookup is never offered to the model, case-insensitively and after trimming, while real names still reach the prompt. Regression test: the wizard used to send the whole lookup table, the model duly picked it, and the builder opened with a category the API refuses. See [`../adr/0007-a-forbidden-lookup-is-never-offered.md`](../adr/0007-a-forbidden-lookup-is-never-offered.md). |
| `Security/QuestionEndpointsAuthTests.cs` | Pure unit (reflection) | Every `QuestionsController` action needs a signed-in caller: the class carries `[Authorize]` and no action has `[AllowAnonymous]`. By reflection so a new action is covered without a new test; also checks the search routes the finding was about are in the set, so it can't silently check nothing. |
| `Security/RolesEndpointTests.cs` | Controller + InMemory DB, JSON | `GET /api/Roles` and `/{id}` return `RoleDTO` — no `concurrencyStamp`, `userRoles` or `rolePermissions` in the JSON, `isActive` and `description` still there — and a missing role is 404. |
| `TestSupport/TestCurrentUserService.cs` | Helper | Test double for `ICurrentUserService` (drives the DbContext query filters). Its `IsAdmin` defaults to **true**, which short-circuits every filter to "see everything" — so a visibility test must set `IsAdmin = false` explicitly or it proves nothing. |

### Frontend — unit tests (`src/**/__tests__`)

| File | Covers |
| --- | --- |
| `src/lib/__tests__/authHelpers.test.ts` | `encode`/`decode`, `hash`, `sanitizeUser`, `requireAdmin`. |
| `src/lib/__tests__/token-store.test.ts` | In-memory access-token get/set/clear. |
| `src/lib/__tests__/date-format.test.ts` | Date formatting + graceful fallbacks. |
| `src/pages/Quiz/Featured/__tests__/featured-catalogue.test.ts` | `fillPanels`: the quiz home page is laid out from the fixed catalogue, not from the API — ladder and panel order fixed, a missing slot or empty panel left out, unknown keys ignored. See [`../quiz/featured-quizzes.md`](../quiz/featured-quizzes.md) §5. |
| `src/loaders/__tests__/featured-quizzes.loader.test.ts` | Which `/choose-quiz` URLs go on to the catalogue: `?category=` and `?shared=` (query intact), not a plain visit or `?settings=`. |
| `src/common/Notifications/__tests__/notifications.test.ts` | Notifications store (pre-existing). |
| `src/hooks/__tests__/use-disclosure.test.ts` | `useDisclosure` hook (pre-existing). |
| `src/components/ui/dialog/__tests__/dialog.test.tsx` | Dialog component (pre-existing). |
| `src/components/ui/dialog/confirmation-dialog/__tests__/confirmation-dialog.test.tsx` | Confirmation flow (pre-existing). |
| `src/pages/UserRelated/Signup/__tests__/signup-auth-config-storm.test.tsx` | Signup when `auth-config` is unreachable: **exactly one** request (regression guard for the request storm — see [social-login.md](../auth/social-login.md)), and the flow **fails closed** to the invite gate rather than an open signup. |
| `src/hooks/__tests__/use-guest-quiz-session.test.tsx` | Guest session startup **rendered inside `StrictMode`**: the hook leaves its loading state with a question, surfaces a failed creation as an error, and creates exactly one session per mount. Guards the hang where a mutation resolved into a detached observer and the page waited forever — see [guest-play.md](../auth/guest-play.md) § "Why this hook awaits its mutations". |
| `src/components/ui/__tests__/button.test.tsx` | `Button` renders normally, and as its child element under `asChild` (Radix `Slot` accepts one element child — the layout `<span>` used to make two and throw). The only `asChild` callers are error screens, so this breaks exactly when it's needed. |
| `src/lib/__tests__/font-defaults.test.ts` | The default app and quiz fonts agree between `global.css` (which paints before any JS runs) and the constant `SettingsApplier` applies. They disagreed for months, so every first paint flashed the wrong typeface. |
| `src/pages/Dashboard/.../AI-Quiz/__tests__/extract-quiz-suggestions.test.ts` | The quiz-level title, category and language are read out of the model's reply **in the parser** — the one place a generated and a pasted reply both pass through. Guards the regression where a pasted reply carrying all three was never enriched and the wizard demanded them by hand. |
| `src/pages/Quiz/Sessions/.../__tests__/resume-projection.test.ts` | `projectResume` agrees with `ResolveAndResumeAsync`: the inclusive `elapsed <= timeLimit` boundary, truncated seconds, the walk restarting from the front of the list, and the abandonment deadline that runs **before** the walk. Written as the server's rules rather than the function's branches, with numbers sitting on each boundary. See [`../quiz/session-resume-screen.md`](../quiz/session-resume-screen.md). |
| `src/pages/Dashboard/.../AI-Quiz/__tests__/parse-ai-output.test.ts` | The trust boundary for model output: JSON found inside a chatty, fenced reply; category, language and visibility come from the quiz, never the model; `allowPartialMatch` is always false; unusable questions are dropped **with a reason** while the rest survive; time limits snap to a value the builder can display; difficulty is matched by name with a reported fallback; and a reply with nothing usable fails with an actionable message. |
| `src/pages/Quiz/Sessions/.../__tests__/question-display.test.tsx` | What one question can send to the server: Submit stays disabled until something is chosen; an answer is submitted **at most once** (lock-in click, then Submit, is still one call); multi-select sends every chosen id; a timeout submits `isTimedOut` and **not** the unsubmitted selection; an answer made in time is never also timed out; a typed answer is trimmed and submits on Enter. Asserts on `onSubmit`, the only thing the server sees. |
| `src/pages/Quiz/Sessions/.../__tests__/quiz-timer.test.tsx` | `QuizTimer` under re-render pressure: it keeps counting while a parent re-renders faster than its own interval with a fresh `onTimeUp` each time, fires `onTimeUp` exactly once, and neither gains nor loses time across a pause/resume. Fake timers drive `Date.now()`, which is what makes a deadline-anchored countdown testable. See [`quiz-timer.md`](../quiz/quiz-timer.md). |
| `src/pages/Quiz/components/quiz-card/__tests__/card-model.test.ts` | `quizSizeLabel`: a Classic card counts its questions (singular for one); an Associations card says "Associations board", never "0 questions". |
| `src/pages/Dashboard/Pages/Quiz/api/__tests__/association-quiz.test.ts` | The board builder: the zod schema mirrors the API (every Tile and solution required, a blank Tile reported at its own path, board time 1–30 minutes, the API's 60–1800s, at most four other spellings); the author's minutes reach the API as whole seconds; spellings split and trimmed; payload keeps board order; an edit read comes back in board order; `quizEditPath` sends each format to its own editor on the right dashboard. |
| `src/pages/Quiz/Associations/board/__tests__/board-model.test.ts` | What the Associations screens derive from the server's view: the countdown corrected for a client clock that runs fast, never below zero; `formatClock` rounds up so 0:00 means time is really up, and `clockReadout` switches from "m:ss min" to "ss sec" under a minute; Tile and target labels; which targets still take a Guess; the timeline's wording; the score breakdown adds up to the score with Final-collected Columns counted once; `coachStep` — the first-play guide points at a Tile, then at that Tile's Column (or the next open target), and stops at the first Guess, a dismissal or the end. |
| `src/pages/Quiz/Multiplayer/utils/__tests__/lobby-start.test.ts` | Why the host's Start is disabled: a Classic quiz needs ≥2 players all ready; a Board is a duel for **exactly 2** ("one too many in the room"), checked before readiness; nothing starts without a pick; a pick without a format is Classic. |
| `src/pages/Quiz/Associations/duel/__tests__/duel-model.test.ts` | The Duel screen from the reader's seat: finding it by username (any case), the turn prompt (open / guess or pass / endgame turns left / the other player's turn), the outcome for winner, loser, a forfeit and a tie, and each move in words with who made it. |
| `src/context/__tests__/lobby-rejoin.test.ts` | The reconnect fix's client half: after an automatic reconnect the provider re-invokes `JoinSession` for the lobby it's in — the latest one, not after leaving, not when in none — and a refused rejoin is reported with the hub's own sentence and forgotten. |
| `src/pages/Quiz/__tests__/quiz-play-path.test.ts` | Play and results routes by format: a Board goes to `/associations/...`, Classic to `/quiz/...`, and the share token travels with either. |

The signup-storm test is worth copying as a pattern: it mocks `@/lib/Api-client` to reject, then
**counts calls over a time window** rather than asserting on rendered output. Render assertions
can't see a retry loop — the DOM looks identical whether a failed request fired once or a
thousand times. Any query whose failure has a designed fallback deserves this shape.

The timer test is the same idea from the other end: the bug it guards against was invisible to
every static assertion, because a frozen countdown renders perfectly valid markup. What exposes it
is **re-rendering on a schedule and asserting the DOM changed anyway**. Any component driven by a
`setInterval` or an animation frame is worth this shape — the failure mode is always "correct in
isolation, broken by whatever the parent happens to do".

The guest-session test is a third variant: **the wrapper is the test.** It renders the hook inside
`<React.StrictMode>` because the bug it guards only exists during StrictMode's mount → unmount →
remount, and it passes against the broken code without that wrapper. Any hook that starts a request
from a mount effect deserves this shape — the app runs under StrictMode, so a test that doesn't is
testing a component the app never renders.

### Frontend — Storybook stories (`*.stories.tsx`)

Twenty-three stories exist, covering the notification surfaces, dialogs and data table (both tones), the
loading and split-flap views, the AI quiz wizard (including its generating overlay), the
create-quiz method dialog, the multiplayer lobby and game, the quiz interface, the
"Session In Progress" screen, and the error boundaries. These power Storybook and Chromatic
visual review.

They are **not** a substitute for the unit suite and are not asserted on in CI today (see the
`storybook` project note under §6). What they are good for is the states that are painful to
reach by hand: `active-session-view.stories.tsx`, for instance, anchors its timestamps to
`Date.now()`, so leaving a story open really does run the countdown out and flip the screen
through each of its outcomes.

---

## 3. How to run

### Backend

Requires the **.NET 8 SDK**.

```bash
# all backend tests
dotnet test OxygenBackend/QuizAPI.Tests/QuizAPI.Tests.csproj

# one class
dotnet test OxygenBackend/QuizAPI.Tests/QuizAPI.Tests.csproj --filter "FullyQualifiedName~AnswerGradingServiceTests"

# one test
dotnet test OxygenBackend/QuizAPI.Tests/QuizAPI.Tests.csproj --filter "Name=SingleSelect_CorrectOption_IsCorrectAndScored"
```

### Frontend

Requires **Node 22**.

```bash
npm ci                              # first run, or after dependency changes

npx vitest run --project unit       # run the unit suite once (CI mode)
npx vitest --project unit           # watch mode while developing
npx vitest run --project unit src/lib/__tests__/authHelpers.test.ts   # a single file

npm run storybook                   # browse component stories
```

> `npm test` runs `vitest` across **all** workspace projects, including `storybook`,
> which needs a Playwright browser. For day-to-day work use `--project unit`.

### End-to-end

Requires PostgreSQL on localhost:5433 (`docker compose -f docker-compose.dev.yml up -d`), the
.NET 8 SDK and `npx playwright install chromium` once. Full guide: [`e2e-testing.md`](e2e-testing.md).

```bash
npm run test:e2e                    # starts the API and the SPA on their own ports, runs, stops
npm run test:e2e:ui                 # Playwright UI mode
```

### Everything (as CI sees it)

```bash
dotnet test OxygenBackend/QuizAPI.Tests/QuizAPI.Tests.csproj
npm ci && npx vitest run --project unit
npm run typecheck:e2e && npm run test:e2e
```

---

## 4. Conventions & patterns

Copy the nearest existing test — these are the four shapes you'll reuse.

### A. Backend pure logic (xUnit)

For dependency-free logic (scoring, validators). Pattern: `QuizScoringTests.cs`.

```csharp
[Theory]
[InlineData(PointSystem.Standard, 1)]
[InlineData(PointSystem.Double, 2)]
public void MultiplierFor_ReturnsConfiguredMultiplier(PointSystem system, int expected)
{
    Assert.Equal(expected, QuizScoring.MultiplierFor(system));
}
```

### B. Backend service with a database (xUnit + EF Core InMemory)

For services that query the DbContext. Pattern: `AnswerGradingServiceTests.cs`. Each test
gets a uniquely-named in-memory database, so tests never bleed into each other.

```csharp
private static ApplicationDbContext NewContext() =>
    new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options,
        new TestCurrentUserService());   // IsAdmin = true bypasses query filters
```

Seed the entities the code under test reads, `SaveChangesAsync`, then call the service.
InMemory doesn't enforce foreign keys, so you only seed what the method actually touches.

### C. Backend service with mocked dependencies (xUnit + Moq)

For services whose collaborators are interfaces (repositories, token service, email).
Pattern: `AuthenticationServiceTests.cs`.

```csharp
private readonly Mock<IUserRepository> _users = new();
// ...
_users.Setup(r => r.EmailExistsAsync("new@example.com", It.IsAny<CancellationToken>()))
      .ReturnsAsync(true);

await Assert.ThrowsAsync<ConflictException>(() => CreateSut().SignupAsync(ValidSignup()));
```

Moq returns a completed `Task` for un-configured async methods, so you only set up the
calls whose return value matters. Start with the guard / failure paths — they're the
highest-value and need the least wiring.

### D. Frontend (Vitest)

Pure logic — pattern: `src/lib/__tests__/authHelpers.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { requireAdmin } from '../authHelpers';

test('throws for a regular user', () => {
  expect(() => requireAdmin({ roles: ['User'] })).toThrow('Unauthorized');
});
```

Hooks / Zustand stores — pattern: `use-disclosure.test.ts` (use `renderHook` + `act`).
Components — pattern: `confirmation-dialog.test.tsx` (use `render`, `screen`,
`fireEvent`/`userEvent`, and import `@testing-library/jest-dom` for matchers).

---

### E. When a mock is the wrong tool

Patterns B and C are both legitimate and the choice between them is not stylistic.

**Mock when the thing under test is one class's decision.** "Does signup reject a breached
password?" needs a checker that says *breached* on demand, not a real HTTP call. The test is fast,
and a failure points at one file.

**Use the real collaborators when the thing under test is the wiring between classes.**
`AccountClosureLoginTests` is the reference: "signing in cancels a pending closure" is a claim about
`LoginAsync`, `AccountClosureService` and `UserRepository` agreeing with each other. A
`Mock<IAccountClosureService>` there would assert only that `LoginAsync` called a method — it would
keep passing if the closure service stopped clearing `IsDeleted`, and keep passing if the lookup
silently reverted to the filtered one. Both are the bug.

**The failure mode to watch for is a stub that has gone stale.** When `LoginAsync` changed from
`GetByEmailAsync` to `GetByEmailIncludingDeletedAsync`, two tests in `AuthenticationServiceTests`
were still stubbing the old method. The mock returned `null`, login threw, and both tests **stayed
green** — including one that would now pass with the password check deleted entirely. Nothing warns
you: Moq answers un-configured calls with a default rather than complaining.

So, when you change a method a mocked collaborator exposes, grep the test project for the old name
in the same change. And if a test's assertion would survive deleting the behaviour it names, it is
testing the mock.

## 5. Adding a new test — step by step

**Backend service (e.g. `SubmitAnswerService`):**

1. Add a file under `OxygenBackend/QuizAPI.Tests/` in a folder matching the area
   (e.g. `Quizzes/SubmitAnswerServiceTests.cs`).
2. Pick the pattern: does it hit the DbContext (→ pattern **B**, InMemory) or talk to
   interfaces (→ pattern **C**, Moq)? Many services use both — real context for data,
   mocks for side-effects like Hangfire/email.
3. Seed/stub only what the method under test reads. Name tests
   `Method_Condition_ExpectedResult`.
4. Run `dotnet test`. No CI change needed — the project globs all `*Tests.cs`.

**Frontend:**

1. Add `<name>.test.ts(x)` in a `__tests__` folder next to the code (the established
   convention here), or co-locate as `<name>.test.ts`.
2. Pure logic → plain Vitest; hook → `renderHook`; component → Testing Library.
3. Run `npx vitest --project unit` in watch mode. CI picks it up automatically.

**End-to-end (Playwright):** first check it belongs there — a claim about the seams between the
SPA, the API and the browser, or a whole journey. Then follow the step-by-step recipe and checklist
in [`e2e-testing.md`](e2e-testing.md) §6 and §12.

**Good next targets:** `QuizSessionService`, `SubmitAnswerService`,
`SessionAbandonmentService` on the backend; the zod schemas in the `api/` folders and
the filtering helpers (`src/lib/filtering`) on the frontend.

---

## 6. CI & the deploy gate

`.github/workflows/tests.yml` runs all three suites on every push and pull request to `main`
(`backend-tests`, `frontend-tests` and `e2e-tests` jobs). A red suite fails the check. The E2E job
runs PostgreSQL as a service and uploads the Playwright report as an artifact —
[`e2e-testing.md`](e2e-testing.md) §5.

To make tests **block deploys**:

1. Re-enable the workflows in `.github/workflows.disabled/`.
2. Add a dependency on the test jobs:

   ```yaml
   jobs:
     build-and-push-frontend:
       needs: [frontend-tests, backend-tests, e2e-tests]
   ```

3. Optionally protect `main` (GitHub → Settings → Branches) and mark
   **Backend (.NET) tests**, **Frontend (Vitest) tests** and **End-to-end (Playwright) tests** as
   required status checks.

---

## 7. Setup notes & known gaps

- **The test project compiles against `QuizAPI`'s real constructors, so it breaks silently
  when they change.** It had drifted out of compilation: `AuthenticationService` gained an
  `IPasswordResetTokenRepository` and an `IBreachedPasswordChecker`, and `IEmailSender.SendAsync`
  gained a `textBody` parameter, without the two auth test classes being updated — so nothing in
  `QuizAPI.Tests` ran at all, and the failure looked like a build error rather than a red test.
  Fixed 2026-09-05. **When you add a constructor parameter to a service that has tests, build the
  test project in the same change** — the solution note below is why it's easy to miss locally.

- **`InternalsVisibleTo`.** `QuizAPI.csproj` exposes its internals to `QuizAPI.Tests`.
  `PwnedPasswordsChecker` deliberately keeps its hash-splitting and response-parsing helpers
  internal — they're implementation, not API — but they're the parts worth unit-testing without
  the network.

- **Solution reference.** The test project still isn't in `QuizAPI.sln` (checked 2026-09-10).
  CI targets the `.csproj` directly so it isn't required, but to see tests in Visual Studio's
  Test Explorer, add it once:

  ```bash
  dotnet sln OxygenBackend/QuizAPI/QuizAPI.sln add OxygenBackend/QuizAPI.Tests/QuizAPI.Tests.csproj
  ```

- **Storybook test project.** `.storybook/vitest.setup.ts` **now exists**, so the `storybook`
  project is no longer broken for a missing file — but it runs stories in a real Chromium
  through Playwright, which is why `npm test` (bare `vitest`, all projects) is still the wrong
  command for everyday work and every recipe above says `--project unit`. Decide deliberately
  whether the story run belongs in CI; today nothing asserts on it.

- **Out of scope this pass.** The Classic multiplayer match loop has no automated tests yet (the
  hub and the Associations Duel loop do — `QuizAPI.Tests/Multiplayer/`), and the E2E suite
  doesn't play multiplayer either. Sign-in, signup, route guards, Classic and guest play are
  covered end to end since 2026-09-30 — [`e2e-testing.md`](e2e-testing.md) §3 lists what is and
  isn't.
