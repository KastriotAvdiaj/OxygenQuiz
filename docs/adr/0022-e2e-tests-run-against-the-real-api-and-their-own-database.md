# 22. E2E tests run against the real API and their own database

Date: 2026-09-30
Status: Accepted

## Context

The Playwright suite (docs/development/e2e-testing.md) needs something to answer the SPA's
requests. Two ways to do that:

- **Mock the API in the browser** (`page.route()` returning canned JSON). Fast, no backend or
  database to start, runs anywhere Node runs, and every response is exactly what the test wants.
- **Run the real API against a real PostgreSQL**, and let tests create their data through it.
  Slower to start (a .NET build, a migration), needs Postgres and the .NET SDK wherever it runs,
  and tests have to cope with a database that outlives them.

The bugs this suite was added to catch are the ones in the seams: a payload the API and the SPA
read differently, the refresh cookie not coming back (its `SameSite=None; Secure` attributes, CORS
with credentials, the session-hint cookie on another port), a route guard that disagrees with the
API's own check, guest play spent by a cookie from one endpoint. A mock reproduces none of these.
It encodes what the test author believes the API does, so it passes exactly when that belief is
wrong. The unit suites already test each side against its own assumptions.

The first run of the suite made the point: it found that a player opening `/dashboard/users`
triggers a real `GET /api/users` and a 403 toast behind the 404 — a disagreement between a route
loader and the API that only exists when both are running.

## Decision

**The E2E suite runs against the real API and a real PostgreSQL, with nothing on the network
mocked.** Test data is created through the API, never written to the database directly.

The stack is **its own**, not the developer's: its own ports (5273 / 7253), its own database
(`OxygenQuiz_E2E`), its own seeded admin, and every setting passed as environment variables so
user-secrets can't leak in (no real email, no AI spend, no third-party calls). All of it is in
`e2e/support/stack.ts`.

**Tests never share data.** Each makes the accounts and quizzes it needs under a unique name, so
the database never has to be reset, tests run in parallel and in any order, and a run can start
while the previous run's rows are still there.

## Consequences

- Running the suite needs PostgreSQL on localhost:5433 and the .NET 8 SDK, not just Node. CI runs
  Postgres as a service; locally it's the same `docker-compose.dev.yml` container.
- A cold run takes minutes (restore, build, migrate); a warm one about a minute. The suite stays
  small and aimed at flows, not at every branch — branches belong in the unit suites.
- The stack runs with the API's rate limits off (`RateLimiting:Enabled=false`, the Development
  default), because one IP driving every request trips the 10-a-minute `auth` policy within a few
  tests. So the suite can't catch a limit that is too tight; that stays a unit-level concern.
- The `OxygenQuiz_E2E` database grows with every run. Harmless (nothing reads it but the suite),
  and dropping it is always safe.
- Anything the API calls outside itself is switched off rather than faked, so flows that depend on
  one — Google/Microsoft sign-in, AI generation, clicking an email link — aren't covered here. If one
  is needed, the API's own fakes are the place to start (the `Fake` AI provider, the logging email
  sender), not `page.route()`.
- `page.route()` is still fine for what the real stack can't produce on demand — a 500, a timeout,
  a slow response — in a test that says so in its name.
