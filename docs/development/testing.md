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

The frontend uses a Vitest **workspace** (`vitest.workspace.ts`) with two projects:

- **`unit`** — fast jsdom tests (configured in `vite.config.ts`). This is the deploy gate.
- **`storybook`** — runs component stories in a real browser via Playwright. Visual /
  interaction coverage, **not** part of the deploy gate.

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
| `Auth/AuthenticationServiceTests.cs` | Service + Moq | Duplicate email/username rejected, missing default role rejected, bad credentials rejected, invalid/empty verification tokens rejected, logout no-op. |
| `Auth/NotACommonPasswordTests.cs` | Pure unit | Common/breached + single-repeated-char passwords rejected; strong passphrases pass. |
| `Visibility/QuestionVisibilityFilterTests.cs` | Filter + InMemory DB | Who may load a question: the guest-vs-owner-vs-stranger matrix over the `QuestionBase` global query filter, including the regression that made every public quiz built from newly-authored (`Private`) questions 500 for anonymous visitors, and the inverse guard that a Private question in a **Draft** quiz stays hidden. Asserts on the `Include`d navigation, not just the join row — the row always loaded; it was `Question` that came back null. See [`quiz-visibility.md`](../quiz/quiz-visibility.md). |
| `Playing/AnswerOptionOrderTests.cs` | Pure unit + InMemory DB | Answer options are shuffled at serve time, deterministically. Pins the whole positional distribution (not just "not first") and the exact permutation, because the two tempting simplifications — seeded `Random`, `string.GetHashCode()` — pass every behavioural test and break only across a restart or a runtime upgrade. See [`../adr/0006-answer-order-is-shuffled-at-serve-time.md`](../adr/0006-answer-order-is-shuffled-at-serve-time.md). |
| `Playing/SessionResumeStateTests.cs` | Projection + InMemory DB | `QuizSessionDto.ResumeState` hands back exactly the question set, in the order, that the resume walk itself iterates. Every test is a way for the two to drift: an answered question or a wrong-version row makes the "Session In Progress" screen promise questions resume won't give. See [`../quiz/session-resume-screen.md`](../quiz/session-resume-screen.md). |
| `Playing/SessionAbandonmentTimeoutTests.cs` | Service + InMemory DB | The abandonment check cannot void a session the catch-up walk would have resumed — stated behaviourally (a session at the walk's furthest reach is still resumable) so it survives a refactor of the arithmetic. Also the min()-of-two-caps deadline, and that a never-played session still ages out. See [`../adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md`](../adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md). |
| `Editing/QuizQuestionVersioningTests.cs` | Pure unit | The copy-on-write edit diff never mutates or deletes a live join row — it retires and inserts — so a session pinned to an older quiz version keeps its exact question set, order, points and time limits. See [`../quiz/quiz-editing.md`](../quiz/quiz-editing.md). |
| `Discovery/QuizVarietyOrderingTests.cs` | Pure unit | The catalogue's "variety" ordering interleaves categories, newest of each first, so a new user sees breadth instead of a wall of one category. Plain LINQ, so it runs identically here and in SQL. See [`../quiz/quiz-discovery.md`](../quiz/quiz-discovery.md). |
| `Questions/AcceptableAnswerRulesTests.cs` | Pure unit | What `Normalize` stores in the acceptable-answers JSON column. Every write path funnels through it — the per-type endpoints, AI import, CSV import — so this is what ends up persisted. |
| `Stats/UserStatsServiceTests.cs` | Service + InMemory DB | Profile play-stats inclusion rules, all three easy to get wrong and impossible to spot when wrong: guest sessions never count, abandoned sessions don't drag the average down, only graded answers reach accuracy. |
| `Users/UserServiceRoleTests.cs` | Service + real repo + InMemory DB | The privilege-escalation rules on "change user role": only a SuperAdmin may grant or remove SuperAdmin, and the last SuperAdmin can't be demoted. Real repository so the lockout count query actually runs. |
| `Auth/InviteCodeServiceTests.cs` | Service + InMemory DB | Mint-time invite rules, load-bearing one being the escalation guard: a role-granting code is a second way to hand out that role, so an Admin must not be able to mint themselves a SuperAdmin code and walk around the guard on role updates. See [`../auth/invite-code-system.md`](../auth/invite-code-system.md). |
| `Auth/ExternalAuthenticationTests.cs` | Service + Moq + real TokenService | Google/Microsoft sign-in: login-or-link resolution, invite-gated external signup, and the signup-ticket boundary. The provider verifier is mocked (their crypto isn't ours to test); the ticket is a real signed JWT, so tamper rejection and "an access token is NOT a ticket" are asserted against the real implementation. See [`../auth/social-login.md`](../auth/social-login.md). |
| `Auth/PwnedPasswordsCheckerTests.cs` | Pure unit (internals) | The two pure halves of the k-anonymity lookup: how the hash is split, how the response is read. Worth testing because **every way it breaks looks like working** — a case change or a stray `\r` turns "breached" into "no match", which is what a healthy check returns for a good password. See [`../auth/password-policy.md`](../auth/password-policy.md). |
| `Ai/AiConfigurationResolverTests.cs` | Pure unit | The decision table behind "a broken AI configuration switches the feature off, it does not stop the app". Two properties matter more than the cases: no input ever throws, and unavailable implies `Enabled == false`. See [`../adr/0004-ai-misconfiguration-disables-the-feature.md`](../adr/0004-ai-misconfiguration-disables-the-feature.md). |
| `Ai/AiGenerationServiceAvailabilityTests.cs` | Service + Moq | `IsAvailableAsync` agrees with the gates inside `GenerateAsync`. The budget case is the one pinned: it's one `await` a refactor can quietly drop while everything compiles and every other test stays green — and the symptom is a live Generate button that 503s. |
| `Ai/AiJsonExtractorTests.cs` | Pure unit | The server's only look at model output: "is there a usable JSON object in here?" That answer decides whether a retry is worth a second call and whether the user's quota slot is released. Semantic validation is deliberately not here — it lives in `parse-ai-output.ts`. |
| `Ai/AiPromptBuilderTests.cs` | Pure unit | The prompt's invariants, asserted directly rather than golden-matched: no entity ids ever reach the model, questions carry no category or language, the allowed-types and time-limit vocabularies are closed. A leaked primary key here would still generate a fine quiz, which is exactly why it needs a test. |
| `Ai/AiVocabularyTests.cs` | Service + Moq | The seeded "Unspecified" lookup is never offered to the model, case-insensitively and after trimming, while real names still reach the prompt. Regression test: the wizard used to send the whole lookup table, the model duly picked it, and the builder opened with a category the API refuses. See [`../adr/0007-a-forbidden-lookup-is-never-offered.md`](../adr/0007-a-forbidden-lookup-is-never-offered.md). |
| `TestSupport/TestCurrentUserService.cs` | Helper | Test double for `ICurrentUserService` (drives the DbContext query filters). Its `IsAdmin` defaults to **true**, which short-circuits every filter to "see everything" — so a visibility test must set `IsAdmin = false` explicitly or it proves nothing. |

### Frontend — unit tests (`src/**/__tests__`)

| File | Covers |
| --- | --- |
| `src/lib/__tests__/authHelpers.test.ts` | `encode`/`decode`, `hash`, `sanitizeUser`, `requireAdmin`. |
| `src/lib/__tests__/token-store.test.ts` | In-memory access-token get/set/clear. |
| `src/lib/__tests__/date-format.test.ts` | Date formatting + graceful fallbacks. |
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
| `src/pages/Quiz/Sessions/.../__tests__/quiz-timer.test.tsx` | `QuizTimer` under re-render pressure: it keeps counting while a parent re-renders faster than its own interval with a fresh `onTimeUp` each time, fires `onTimeUp` exactly once, and neither gains nor loses time across a pause/resume. Fake timers drive `Date.now()`, which is what makes a deadline-anchored countdown testable. See [`quiz-timer.md`](../quiz/quiz-timer.md). |

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

Twenty-three stories exist, covering the notification surfaces, dialogs and data table, the
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

### Everything (as CI sees it)

```bash
dotnet test OxygenBackend/QuizAPI.Tests/QuizAPI.Tests.csproj
npm ci && npx vitest run --project unit
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

**Good next targets:** `QuizSessionService`, `SubmitAnswerService`,
`SessionAbandonmentService` on the backend; the zod schemas in the `api/` folders and
the filtering helpers (`src/lib/filtering`) on the frontend.

---

## 6. CI & the deploy gate

`.github/workflows/tests.yml` runs both suites on every push and pull request to `main`
(`backend-tests` and `frontend-tests` jobs). A red suite fails the check.

To make tests **block deploys**:

1. Re-enable the workflows in `.github/workflows.disabled/`.
2. Add a dependency on the test jobs:

   ```yaml
   jobs:
     build-and-push-frontend:
       needs: [frontend-tests, backend-tests]
   ```

3. Optionally protect `main` (GitHub → Settings → Branches) and mark
   **Backend (.NET) tests** and **Frontend (Vitest) tests** as required status checks.

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

- **Out of scope this pass.** End-to-end flows (login → take a quiz → results), the Python
  LLM microservice, and SignalR multiplayer hubs have no automated tests yet. Playwright is
  already a dependency if you want to add browser-level E2E later.
