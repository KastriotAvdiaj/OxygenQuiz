# End-to-end testing (Playwright)

The E2E suite drives a real Chromium against the real API and a real PostgreSQL database. Nothing
on the network is mocked. It exists for the failures the unit suites can't see: the SPA and the API
disagreeing about a payload, cookies and CORS, route guards, and flows that only break when every
piece is running together.

It lives in `e2e/`, is configured in `playwright.config.ts`, and runs in CI as the
**End-to-end (Playwright) tests** job. Why a real backend and not mocked responses:
[ADR 0022](../adr/0022-e2e-tests-run-against-the-real-api-and-their-own-database.md). For the
backend and unit suites, see [`testing.md`](testing.md).

**Contents:** 1. Running it · 2. The stack · 3. What is covered · 4. Should this be an E2E test? ·
5. How the suite is laid out · 6. Adding a test, step by step · 7. Conventions · 8. Extending the
toolkit · 9. Recipes · 10. Debugging · 11. Flakiness · 12. Checklist · 13. CI · 14. When it goes
wrong

---

## 1. Running it

**Once per machine:**

```bash
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL on localhost:5433
npm ci                                           # includes @playwright/test
npx playwright install chromium                  # the browser Playwright drives
dotnet dev-certs https --trust                   # you likely did this already for the API
```

**Then:**

```bash
npm run test:e2e                          # the whole suite
npm run test:e2e -- e2e/auth.spec.ts      # one file
npm run test:e2e -- -g "signs up"         # tests whose title matches
npm run test:e2e -- --last-failed         # only what failed last time
npm run test:e2e:ui                       # UI mode: watch, pick tests, time-travel through steps
npm run typecheck:e2e                     # tsc over e2e/ and the config (CI runs this too)
npx playwright show-report                # the HTML report of the last run
```

`npm run test:e2e` starts the API (`dotnet run`, Release configuration) and the SPA (Vite) itself,
waits until both answer, runs the tests, and stops both. The first run takes a few minutes: it
restores, builds and creates the database. After that a run takes about a minute.

**Leave the stack up while writing tests.** Outside CI, Playwright reuses a server that is already
listening on the port, so starting it once saves the start-up on every run. UI mode
(`npm run test:e2e:ui`) keeps both servers alive until you close it.

The catch is the other side of the same behaviour: **a reused API does not pick up backend
changes.** After editing C#, stop whatever holds port 7253 before the next run. Frontend changes
are picked up, since Vite serves the source directly.

---

## 2. The stack

`e2e/support/stack.ts` is the single source for all of this. It is **not your dev stack**:

| | Dev | E2E |
|---|---|---|
| SPA | https://localhost:5173 | https://localhost:5273 |
| API | https://localhost:7153 | https://localhost:7253 |
| Database | whatever your user-secrets say | `OxygenQuiz_E2E` on localhost:5433 |
| Admin | `Seed:AdminEmail` / your secret | `admin@e2e.oxygenquiz.test` / `E2e-Admin-Pa55word` |

So a run never touches your dev data, and it can run with `npm run dev` and the API open in Visual
Studio. The API is built in **Release** because a debugging session in Visual Studio holds
`bin/Debug` open.

The API is started with environment variables, which beat both `appsettings*.json` and
`dotnet user-secrets`. Besides the ports and the connection string, they:

- **switch the rate limits off** (`RateLimiting__Enabled=false`). Every request comes from one IP,
  and every page load resumes the session through `/refresh`, which is in the 10-a-minute `auth`
  policy. Development already has them off; the suite says so itself rather than rely on that.
  See [`rate-limiting.md`](rate-limiting.md), "In development".
- **blank every third-party secret** (Brevo, AI) and switch off the breached-password lookup and
  Google/Microsoft sign-in. A test run must not send email, spend AI budget, or depend on
  someone else's service being up. Emails are written to the API log instead.
- keep `ASPNETCORE_ENVIRONMENT=Development`, for the relaxed password minimum and the dev sample
  data. (The lookups the tests build quizzes from — Science, English, Easy — and the sixteen
  featured quizzes are seeded in every environment since 2026-10-07; see
  [`../quiz/featured-quizzes.md`](../quiz/featured-quizzes.md).)

If a feature you're testing needs a new setting, add it to `apiServerEnv()` in `stack.ts` — never
rely on `appsettings.Development.json` or your user-secrets, which CI doesn't have.

**TLS.** Both servers use the ASP.NET development certificate. The web server command exports it
to `e2e/.tls/` (gitignored) and `vite.config.ts` serves it when `E2E_TLS_CERT` / `E2E_TLS_KEY`
are set — in which case it skips `vite-plugin-mkcert`, whose first run asks the GitHub API for a
download that CI runners are regularly refused. The browser ignores certificate errors
(`ignoreHTTPSErrors`), so the certificate doesn't have to be trusted.

**Overrides.** `E2E_WEB_PORT`, `E2E_API_PORT`, `E2E_DB_CONNECTION`, `E2E_ADMIN_EMAIL`,
`E2E_ADMIN_PASSWORD`, `E2E_ADMIN_USERNAME` and `E2E_JWT_KEY` replace the defaults.

**Resetting the database.** Nothing needs it — tests don't depend on what's already there — but
if you change the admin credentials (the seeder only creates the admin when it's missing) or
want a clean slate:

```bash
docker exec oxygen-postgres dropdb -U postgres --force OxygenQuiz_E2E
```

The next run recreates and migrates it.

---

## 3. What is covered

> **Keep this table complete** — add a row in the same change as the spec, like the tables in
> [`testing.md`](testing.md). A stale inventory reads as "this is all that's tested" and invites
> writing a test that already exists.

| File | Covers |
| --- | --- |
| `e2e/auth.spec.ts` | Signup through the whole invite-gated form (code → username → email → password → confirm), landing signed in. A made-up invite code refused by the server before the form opens. Sign-in, **the session surviving a reload** (in-memory access token gone, the hint cookie sends the app to `/refresh`, the HttpOnly cookie brings it back), sign-out that holds across a reload. A wrong password refused. |
| `e2e/access-control.spec.ts` | Signed out → a protected page sends you to `/login?redirectTo=…` and signing in lands you back on it. The admin dashboard, to a signed-in player, is **indistinguishable from a URL that doesn't exist** (same 404 screen, compared against a real unknown URL rather than hard-coded text) and opens for the admin. A `fixme` test for the known issue below. |
| `e2e/classic-play.spec.ts` | A player answers all three Classic question types (one on purpose wrong) with instant feedback; the result shows 2 correct / 1 incorrect / 67, the review shows the answers, and the attempt is in Quiz History linking to that result. A quiz left after one answer is offered back on **Session In Progress** and resumes at question two. |
| `e2e/guest-play.spec.ts` | A signed-out visitor plays one free quiz and sees the "won't be saved" result; the second attempt goes through `/login?…&guestUsed=1`, and signing in there returns to the quiz. |
| `e2e/featured-quizzes.spec.ts` | The quiz home page: a signed-out visitor picks Geography · Easy from its panel, starts it from the dialog and lands on its first question — the whole chain from the seeder through `GET /quiz/featured` to guest play. **Explore more quizzes** reaches the catalogue, and an old `/choose-quiz?category=` link is redirected there. |

**Known issue, pinned by a `fixme` test:** a player who opens `/dashboard/users` does get the 404,
but only after the page's own loader has called `GET /api/users` and shown a 403 toast.
[`known-issues.md`](../deployment/known-issues.md), "Hidden admin pages still call the API before
they 404". Remove the `fixme` with the fix; the test fails today.

**Not covered yet**, roughly in order of value: Classic multiplayer (the recipe in §9 is the
shape), the quiz builder (by hand and the AI wizard with the `Fake` provider), password reset and
email confirmation (they need the link — see §9), account settings and closure, the Associations
format, sharing an Unlisted quiz by link.

---

## 4. Should this be an E2E test?

E2E tests are the slowest and most expensive tests in the repo, so each one has to earn its place.
Write one when **the thing that can break lives between two pieces** — the SPA and the API, the
browser and a cookie, a route loader and the endpoint behind it — or when the claim is about a
whole user journey.

| The claim | Where it belongs |
| --- | --- |
| "Signing in survives a reload" (cookie + `/refresh` + route loader) | **E2E** |
| "A player can't tell the admin area exists" (loader + error element + API) | **E2E** |
| "Finishing a quiz shows the right score and saves it to history" | **E2E** |
| "A typed answer ignores accents and a leading article" | Backend unit (`TypeTheAnswerMatcherTests`) |
| "The timer fires `onTimeUp` exactly once under re-renders" | Frontend unit (`quiz-timer.test.tsx`) |
| "The zod schema rejects a board with a blank Tile" | Frontend unit |
| "This button looks right in dark mode" | Storybook / Chromatic |

Rules of thumb:

- **One E2E test per journey, not per branch.** Edge cases (every wrong-answer variant, every
  validation message) go in unit tests, which run in milliseconds and point at one file. The E2E
  test proves the journey works end to end once.
- **A bug found in the seams gets an E2E regression test;** a bug in one function gets a unit test.
- If the test would need to fake the API to be written, it's probably a unit or component test.

---

## 5. How the suite is laid out

```
playwright.config.ts          runner config: servers, timeouts, reporters, browsers
e2e/
  tsconfig.json               Node-side TS project (npm run typecheck:e2e)
  <area>.spec.ts              the tests, one file per area (auth, access-control, classic-play…)
  support/
    stack.ts                  ports, URLs, admin credentials, API/SPA environment
    api.ts                    AdminApi (setup through the real API), uniqueSuffix, newCredentials
    fixtures.ts               the `test` every spec imports: admin, player, sampleQuiz, page objects
    sample-quiz.ts            SAMPLE_QUESTIONS — the quiz most tests play
    pages/                    page objects: login-page.ts, quiz-play-page.ts
```

What goes where:

- **A spec file** holds tests for one area of the product, named for what the user does, not for
  a component (`classic-play`, not `quiz-page`). Add to an existing file when the area matches;
  start a new one when it doesn't. Open each file with a doc comment saying what the area is and
  linking its feature doc.
- **`support/api.ts`** holds everything that sets up state through the API.
- **`support/fixtures.ts`** turns setup into something a test can ask for by name.
- **`support/pages/`** holds screens that more than one spec drives. A screen only one test
  touches stays inline in that test until a second test needs it.

---

## 6. Adding a test, step by step

1. **Decide it belongs here** (§4), and check §3 that it doesn't already exist.
2. **Walk the flow by hand** in the E2E stack (`npm run test:e2e:ui` keeps it up at
   https://localhost:5273; sign in as the E2E admin or a player you create). Note what the user
   sees at each step: headings, button names, messages.
3. **Pick the file.** An existing `e2e/<area>.spec.ts`, or a new one with a doc comment.
4. **List what the test needs to exist first** — an account, a quiz, a specific setting — and get
   each from a fixture (§8). If there's no fixture for it, add an `AdminApi` method and, if more
   than one test will want it, a fixture.
5. **Write the test from the template below.** Name it as a sentence describing the behaviour.
   Assert the outcome the user sees, and the saved state when that's the point (history, a
   reload).
6. **Run it alone, then repeatedly, in parallel:**
   ```bash
   npm run test:e2e -- -g "your test title"
   npm run test:e2e -- -g "your test title" --repeat-each 5 --workers 4
   ```
   Five green runs in parallel is the bar. A test that fails 1 time in 20 will fail CI every week.
7. **Prove it can fail.** Break the behaviour it claims to protect (comment out the redirect,
   return the wrong status) and watch it go red for the right reason. Put the code back. A test
   that stays green with the feature broken is testing nothing.
8. **Finish the change:** `npm run typecheck:e2e`, `npx eslint e2e`, a row in §3, and a note under
   "Not covered yet" if you closed one of those gaps.

### Template

```ts
import { expect, test } from "./support/fixtures";

/**
 * <The area, in a sentence or two> (docs/<area>/<feature>.md).
 */

test("a player <does the thing> and <sees the outcome>", async ({ page, player, sampleQuiz }) => {
  void player; // requested for its effect: this browser is signed in as a new player

  // Arrange: anything beyond the fixtures, through the API.
  // Act: what the user does, through the page.
  await page.goto(`/quiz/${sampleQuiz.id}/play`);
  await page.getByRole("button", { name: "Mars", exact: true }).click();

  // Assert: what the user sees, then what was saved.
  await expect(page.getByText(/^Correct!/)).toBeVisible();
});
```

`void player;` is there because a fixture only runs if the test names it, and a test that needs
the signed-in browser but never reads `player` would otherwise trip the unused-variable lint.

---

## 7. Conventions

### Names

- Test titles are sentences about behaviour, readable in a CI failure list without the code:
  "a wrong password is refused and nobody is signed in", not "login error test".
- `test.describe` groups only when a file covers more than one sub-area (`Signup`, `Sign in and
  out`). Don't nest describes.

### Test data

- **Every test makes its own data, under a unique name** (`uniqueSuffix()`). The database keeps
  every previous run, and other tests run at the same time. Never look something up by a fixed
  title or rely on a row another test made — and never assume a list is empty or has N rows;
  filter to your own item (`getByRole("row").filter({ hasText: quiz.title })`).
- **Through the API, never SQL.** A row the API wouldn't create is one no user can reach. If the
  API can't create what you need, that's a missing API, not a reason to write to the database.
- **No clean-up.** Tests don't delete what they made; unique names make leftovers harmless, and a
  test that fails half-way would skip its clean-up anyway.
- **Each test is a new browser context** — no cookies, no storage. That's why guest play always
  starts with its free quiz unspent. Don't share a signed-in state between tests.

### Signing in

- **Through the form only when sign-in is what you're testing** (`auth.spec.ts`,
  `access-control.spec.ts`). Everywhere else take `player`: `AdminApi.createPlayer(context)` signs
  up through the browser context's own request client, so the refresh and session-hint cookies
  land in the browser exactly as after a real signup.
- An account that exists but isn't signed in: `await admin.createPlayer()` (no context).
- The admin through the UI: `loginPage.signIn(ADMIN)` (see `access-control.spec.ts`).

### Finding things on the page

Query the way a user looks, in this order:

1. `getByRole` with the accessible name — `getByRole("button", { name: "Submit", exact: true })`
2. `getByLabel` for form fields
3. `getByPlaceholder` when a field has no label
4. `getByText` for messages
5. `getByTestId` — last resort, and it means adding `data-testid` to the component; say why in a
   comment next to it

Never CSS classes (Tailwind classes change with every restyle), never `nth()` or positions, never
XPath. Use `exact: true` when a name is a prefix of another ("Next" vs "Next question"), and scope
to a region when a page repeats text (`page.getByRole("tabpanel", { name: "Overview" }).getByText(…)`).

App-specific traps:

- **Answer options are shuffled at serve time** ([ADR 0006](../adr/0006-answer-order-is-shuffled-at-serve-time.md)).
  Pick them by text, never by position.
- **Several inputs have no label** — the signup steps and the typed answer are reachable only by
  placeholder. That's an accessibility gap as much as a testing one; when you fix one, switch the
  test to `getByLabel`.
- **Nested banners** on dashboard pages: `getByRole("banner")` matches two elements there. Use the
  `accountButton(page, username)` helper for the signed-in user's button.
- **Development-only prefill:** `LoginForm` fills the local admin's credentials under `npm run dev`.
  `fill()` replaces them; never assume a field starts empty.
- **Error screens don't have fixed text we test against.** Compare them with the real thing (see
  `notFoundScreen()` in `access-control.spec.ts`), so rewording copy doesn't break tests.

### Waiting

Web-first assertions (`await expect(locator).toBeVisible()`, `toHaveURL`, `toHaveText`) retry
until they pass or time out. That is the only waiting a test normally needs.

- **Never `page.waitForTimeout()`.** It's either too short (flaky) or too long (slow), usually both.
- **Never `expect(await locator.isVisible()).toBe(true)`** — that checks once, no retry.
- **When the thing to wait for is a request**, wait for the response. Start waiting *before* the
  action that triggers it:
  ```ts
  const spent = page.waitForResponse(
    (r) => r.request().method() === "POST" && /\/guest-quiz-sessions\/[^/]+\/finish$/.test(r.url()),
  );
  await quizPlay.finish();
  expect((await spent).status()).toBe(204);
  ```
  The guest test does this because that response carries the cookie that spends the free quiz, and
  navigating away before it lands aborts it.
- **"Nothing appears" is tricky.** `toHaveCount(0)` retries until it passes, so it also passes once
  a toast has faded out. To prove something never happened, record it (a response listener, as in
  the `fixme` test) and assert on the record.

### Assertions

- **Assert on what's deterministic.** Final scores carry a speed bonus, so the classic test asserts
  accuracy (`67`) and the correct/incorrect counts, not points. Timestamps, generated ids and
  anything time-based are the same.
- **Assert the outcome, then the persistence** when saving is part of the claim: the result
  screen, then Quiz History, or a `page.reload()` and the same check again.
- **Say why in a comment** when an assertion is there for a non-obvious reason; the tests are also
  documentation of the behaviour.

### Page objects

- A page object wraps one screen: locators as `readonly` fields, and methods named for what a
  **user** does (`answer`, `next`, `finish`, `signIn`) — not for DOM mechanics (`clickSubmit`).
- Methods may wait for the result of their own action (`answer` waits for the verdict, `finish`
  for the results URL), so callers can't forget to.
- Keep assertions about the **outcome** in the test, not the page object. The test reads as the
  specification; the page object is the vocabulary.
- Expose it as a fixture in `fixtures.ts` so tests ask for it by name.

---

## 8. Extending the toolkit

### A new setup call (`support/api.ts`)

Add a method to `AdminApi`. Use the same shape as the existing ones:

```ts
/** A Draft quiz — visible to its owner and admins only (docs/quiz/quiz-visibility.md). */
async createDraftQuiz(title: string, questions: readonly QuestionSpec[]): Promise<CreatedQuiz> {
  // …post through this.http, wrapped in ok(response, "what this is doing")
}
```

- Go through `this.http` (signed in as the SuperAdmin) and the real endpoint the UI uses.
- Wrap every call in `ok(response, "Doing X")` so a failed setup says what it was doing and shows
  the API's answer, instead of failing later with a confusing locator timeout.
- Resolve lookups by **name**, not id (`sampleLookups()` does this): ids depend on insertion order.
- Return plain data (ids, titles, credentials), not API response objects.

If the setup must be done **as the player** (a quiz they own, a session of theirs), remember the
API authenticates with a bearer token — the browser's cookies only work for `/refresh`. Sign the
player in on a separate `request.newContext()` with their `Credentials` and use the returned token,
exactly as `AdminApi.signIn()` does for the admin. That opens a second session for the same
account and leaves the browser's own session alone.

### A new fixture (`support/fixtures.ts`)

Add it when **more than one test** needs the same setup:

```ts
type TestFixtures = {
  // …
  draftQuiz: CreatedQuiz;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // …
  draftQuiz: async ({ admin }, use) => {
    await use(await admin.createDraftQuiz(sampleQuizTitle(), SAMPLE_QUESTIONS));
  },
});
```

- **Test-scoped** (the default) for anything a test could change: accounts, quizzes, sessions.
- **Worker-scoped** (`{ scope: "worker" }`) only for read-only things that are slow to make — today
  just the admin sign-in.
- Describe it in the comment at the top of `fixtures.ts` and in the fixture table below.

| Fixture | What it is |
| --- | --- |
| `admin` | `AdminApi` — the API as the seeded SuperAdmin (one per worker). `createPlayer(context?)`, `mintInviteCode()`, `createClassicQuiz(title, questions)`. |
| `player` | A new account, **with the test's browser already signed in to it**. Its value is the `Credentials` (email, username, password). |
| `sampleQuiz` | A new Public Classic quiz, one question of each type (`sample-quiz.ts`), 60 s a question, instant feedback on. |
| `loginPage` | `LoginPage` — `/login`. |
| `quizPlay` | `QuizPlayPage` — Classic play for players and guests. |

### New sample data

`SAMPLE_QUESTIONS` is the default quiz; build a different one with `admin.createClassicQuiz(title,
questions)` when a test needs other content. Keep the answer inside the question spec (as
`QuestionSpec` does) so the page object can answer it right or wrong without the test repeating
the answer key. Keep time limits long (60 s) unless the timer is what you're testing.

---

## 9. Recipes

### Two players in one test (multiplayer)

A second browser context is a second person. `browser.newContext()` inherits the config's
`baseURL` and `ignoreHTTPSErrors`:

```ts
test("two players …", async ({ browser, admin, page: host, player: hostPlayer }) => {
  const guestContext = await browser.newContext();
  try {
    const guestPlayer = await admin.createPlayer(guestContext);
    const guest = await guestContext.newPage();
    // host.goto(...) / guest.goto(...) — drive both, assert on both.
  } finally {
    await guestContext.close();
  }
});
```

Checked working (a second context signed in through `createPlayer(context)` lands signed in on
`/`). SignalR runs over WebSockets through the same stack, so nothing else is needed.

### A flow that needs an email link (confirmation, password reset)

The E2E API has no email provider, so messages go to the API log — and the suite ignores the API's
stdout. That's why these flows aren't covered. The clean way to add them is a Development-only,
test-facing way to read the last message for an address (for example an in-memory sender behind
an endpoint that exists only when an `E2E` setting is on), switched on through `apiServerEnv()`.
That's a backend change with its own security review — don't scrape logs.

### An error the real stack won't produce on demand

A 500, a timeout, a slow response: intercept that one request with `page.route()`, and say so in the
test's name ("…shows a retry when the question fails to load"). Everything else in that test stays
real (ADR 0022).

```ts
await page.route("**/api/QuizSessions/*/next-question", (route) =>
  route.fulfill({ status: 500, json: { message: "boom" } }),
);
```

### A known bug

Write the test that describes the **correct** behaviour, confirm it fails, and mark it
`test.fixme(…)` with a comment pointing at its entry in
[`known-issues.md`](../deployment/known-issues.md). The fix then removes the `fixme` — and the test
proves the fix. See the `/dashboard/users` test in `access-control.spec.ts`.

### Time

Don't wait for real countdowns. Keep time limits long when time isn't the point. When it is (a
question timing out), use Playwright's clock (`await page.clock.install()` before navigating, then
`page.clock.fastForward("01:00")`), remembering that the **server** also enforces deadlines and
doesn't see the browser's fake clock — so a server-side expiry can't be tested this way.

### Phone-sized screens

Add a project to `playwright.config.ts` (`{ name: "mobile", use: { ...devices["Pixel 7"] } }`) and
restrict it to the specs that matter with `testMatch`, rather than doubling the whole suite.

### Recording a first draft

With the stack up, `npx playwright codegen --ignore-https-errors https://localhost:5273` records
clicks as code. Use it to discover locators, then rewrite the result to these conventions — it
produces the steps, not the assertions, and not the reasons.

---

## 10. Debugging

| Tool | When |
| --- | --- |
| `npm run test:e2e:ui` | Writing a test; watch mode, step through each action with the DOM at that moment. |
| `npm run test:e2e -- -g "title" --debug` | Step through one test in the Playwright Inspector. |
| `npm run test:e2e -- --headed` | Watch it run in a visible browser. |
| Trace (`test-results/e2e/**/trace.zip`) | Any failure. Every failing test keeps one; `npx playwright show-trace <file>`, or open it from the HTML report. Shows every action, DOM snapshots, network and console. |
| `error-context.md` next to the trace | An accessibility snapshot of the page at the moment of failure — often enough on its own. |
| `npx playwright show-report` | The last run's HTML report; in CI, the `playwright-report` artifact. |

Reading a failure: the trace's network tab answers most "why is this element missing" questions —
a 4xx from the API, a request that never went out, or a redirect you didn't expect.

---

## 11. Flakiness

A flaky test is worse than none: people learn to re-run CI instead of reading it. The usual causes
here, and the fix for each:

| Cause | Fix |
| --- | --- |
| Waiting a fixed time | A web-first assertion or `waitForResponse` (§7). |
| Depending on another test's data or the order tests run in | Make your own data (§7). |
| Picking by position (shuffled options, sorted lists that others add to) | Pick by text; filter rows to yours. |
| Asserting on time-dependent values (points, "2s", dates) | Assert what's deterministic. |
| Navigating away before a request finished | Wait for the response first (the guest test). |
| A first-visit Vite compile making the first test slow | Already covered by the 60 s test timeout; don't raise it per test. |

CI retries a failing test once. **A test that passes only on retry is flaky** — it shows as
"flaky" in the report. Fix it; don't raise retries or timeouts to hide it.

---

## 12. Checklist before committing a test

- [ ] It belongs in E2E (§4), and §3 didn't already have it.
- [ ] Its title is a sentence about behaviour.
- [ ] It makes its own data through the API, under unique names.
- [ ] Locators are role/label/placeholder/text — no CSS, no positions.
- [ ] No `waitForTimeout`, no one-shot `isVisible()` checks.
- [ ] It passed `--repeat-each 5 --workers 4`.
- [ ] It failed when the behaviour it protects was broken.
- [ ] `npm run typecheck:e2e` and `npx eslint e2e` are clean.
- [ ] §3 has a row (or an updated one), and "Not covered yet" is still true.
- [ ] Any new environment setting is in `stack.ts`, not in a local file.

---

## 13. CI

The `e2e-tests` job in `.github/workflows/tests.yml` runs PostgreSQL 15 as a service on port 5433
(the same address as `docker-compose.dev.yml`), creates the dev certificate, installs Chromium and
runs `npm run typecheck:e2e` then `npm run test:e2e`. In CI Playwright never reuses a server, runs
two workers, retries a failing test once, and fails the run on a leftover `test.only`. The HTML
report is uploaded as the `playwright-report` artifact, traces included, whether the run passed or
not.

A new spec file needs no CI change — `playwright.config.ts` picks up every `e2e/**/*.spec.ts`.

---

## 14. When it goes wrong

| Symptom | Cause |
| --- | --- |
| `Signing in as the E2E admin … failed: HTTP 401` | The E2E database was seeded with other admin credentials. Drop it (§2). |
| `… is already used, make sure that nothing is running on the port` | Only in CI mode (`CI=1`): something holds 5273 or 7253. Locally it would be reused instead. |
| `Process from config.webServer was not able to start` | Its own output is printed above the error. For the API it's almost always PostgreSQL not running on 5433. |
| The API never becomes ready | Run the `dotnet run` command from `playwright.config.ts` by hand with the same environment to see its log. |
| Backend change has no effect | A reused API is still running the old build (§1). |
| `the seeded QuestionCategories "Science"` assertion | The seeder didn't run, or someone renamed the category in the E2E database. Drop it (§2). |
| Every test fails on the first `goto` with a TLS error | `ignoreHTTPSErrors` was dropped from the config, or a new context was created with explicit options that leave it out. |
| Vitest suddenly runs `*.spec.ts` from `e2e/` | The `exclude` in `vite.config.ts`'s `test` block was removed. |
