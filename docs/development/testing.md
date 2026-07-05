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

| File | Type | Covers |
| --- | --- | --- |
| `Scoring/QuizScoringTests.cs` | Pure unit | Speed bonus, point-system multipliers, the "never below 1" floor, edge cases (no limit, over-time, negative time). |
| `Grading/AnswerGradingServiceTests.cs` | Service + InMemory DB | Right/wrong decisions for every question type (single & multi-select MCQ, true/false, type-the-answer with case sensitivity and acceptable alternatives), the timeout-to-zero override, and unknown-question handling. |
| `Auth/AuthenticationServiceTests.cs` | Service + Moq | Duplicate email/username rejected, missing default role rejected, bad credentials rejected, invalid/empty verification tokens rejected, logout no-op. |
| `Auth/NotACommonPasswordTests.cs` | Pure unit | Common/breached + single-repeated-char passwords rejected; strong passphrases pass. |
| `TestSupport/TestCurrentUserService.cs` | Helper | Test double for `ICurrentUserService` (drives the DbContext query filters). |

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

### Frontend — Storybook stories (`*.stories.tsx`)

Eight stories exist (notifications, dialogs, loading-wave, pagination, multiplayer game,
quiz interface). These power Storybook and Chromatic visual review.

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

- **Solution reference.** The test project isn't yet in `QuizAPI.sln`. CI targets the
  `.csproj` directly so it isn't required, but to see tests in Visual Studio's Test
  Explorer, add it once:

  ```bash
  dotnet sln OxygenBackend/QuizAPI/QuizAPI.sln add OxygenBackend/QuizAPI.Tests/QuizAPI.Tests.csproj
  ```

- **Storybook test project.** `vitest.workspace.ts` points the `storybook` project at
  `.storybook/vitest.setup.ts`, which doesn't exist yet. Create that setup file (or remove
  the `storybook` project from the workspace) before wiring Storybook tests into CI.

- **Out of scope this pass.** End-to-end flows (login → take a quiz → results), the Python
  LLM microservice, and SignalR multiplayer hubs have no automated tests yet. Playwright is
  already a dependency if you want to add browser-level E2E later.
