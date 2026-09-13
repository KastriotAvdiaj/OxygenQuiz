# OxygenQuiz — Session Handoff

Paste this into a new chat to bootstrap context. Last updated **2026-09-13**.

## Project

- **OxygenQuiz** — a quiz app. Frontend: React + Vite + TypeScript (TanStack Query,
  react-router, Tailwind, shadcn-style UI). Backend: ASP.NET Core 8 + EF Core (Postgres).
- Repo root has `OxygenBackend/QuizAPI` (.NET), `OxygenBackend/QuizAPI.Tests` (xUnit), `src/`
  (frontend).
- Backend tests: `dotnet test OxygenBackend/QuizAPI.Tests/QuizAPI.Tests.csproj` — **342 passing**
  as of this handoff.
- Frontend typecheck: `./node_modules/.bin/tsc --noEmit -p tsconfig.json`. NOTE: tsc does NOT catch
  Babel/Vite transform errors (e.g. a `{/* */}` comment inside a JSX attribute's braces, which is
  an object literal, not a comment) — load the page or `npm run build` to catch those.
- Migrations apply themselves: `Program.cs` calls `MigrateAsync()` at startup, so deploying is
  `git pull` + the compose rebuild. Never run migrations by hand.

---

## Closed: "signing in didn't restore my closed account"

Reported on 2026-09-13 as *"invalid credentials"* when signing back in during the grace period.
**It was the Google path, not the password path** — and worth reading once, because the shape of the
mistake is repeatable.

`LoginAsync` was correct and its three tests were real. But recovery is a property of **signing in**,
not of `LoginAsync`, and `ExternalLoginAsync` still resolved its user through the filtered
`GetByIdAsync`: a closing account came back null, which the code read as "this link points at
nothing" and answered `Invalid credentials`. For an account created with Google and no password,
that was no route back in at all. The branch matching a verified provider email had the same hole
from the other side — it would have fallen through to signup and created a **second** account on the
same address.

Fixed by giving both external branches widened lookups and one shared decision with the password
path, `AuthenticationService.AdmitOrRejectDeletedAsync`. Verified against the live stack, not just
the suite. Covered by `QuizAPI.Tests/Auth/AccountClosureExternalLoginTests.cs`; the table in
[`auth/account-closure.md`](auth/account-closure.md) §3 lists every path and its lookup, and a new
sign-in method needs a row there and a test of its own.

Four tests in `ExternalAuthenticationTests` had to be repointed at the new lookups — they were
stubbing the methods the service no longer calls, so they failed loudly. That is the good version of
`testing.md` §4E: the stale-stub hazard only goes quiet when the stub isn't what the test asserts on.

**Then the email half of the same bug.** `EmailExistsAsync` also ran through the filter, so a closing
account's address read as free and could be re-registered — which would have cost its owner the
recovery above, since sign-in finds a closing account by email. It now counts live and closing rows,
and deliberately not admin-deleted ones (nothing anonymises those, so the address would be burned
forever). Signup answers both cases with one message that names neither. See
[`auth/account-closure.md`](auth/account-closure.md) §7.

---

## Read these before changing anything in this area

The reasoning lives in the docs, not in this file:

| Doc | What it settles |
|---|---|
| [`adr/0011-system-accounts-are-protected-rows.md`](adr/0011-system-accounts-are-protected-rows.md) | `IsProtected`, the delete matrix, why the count-based last-SuperAdmin guard was removed |
| [`adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md`](adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md) | Why deletion is anonymisation, not `DELETE` |
| [`auth/account-closure.md`](auth/account-closure.md) | How closure behaves today; §7 is the to-do list |
| [`auth/user-role-management.md`](auth/user-role-management.md) | Role rules + §1.1 the delete matrix |
| [`development/testing.md`](development/testing.md) | §2 the test inventory (keep it complete), §4E when a mock is the wrong tool |
| [`quiz/multiplayer-persistence-plan.md`](quiz/multiplayer-persistence-plan.md) | Designed, **not built**. Six work items |
| [`RESPONSIVE.md`](RESPONSIVE.md) | "Dense tables" and "Dashboard list pages: one header, one card" |

---

## What was built 2026-09-11 → 09-13

**A live security hole, closed.** Any Admin could soft-delete any SuperAdmin, irreversibly —
nothing sets `IsDeleted` back and the global `!IsDeleted` filter hides the row from everything that
could find it. Now: `User.IsProtected` on the seeded root admin and guest placeholder (migration
backfills, `DbSeeder` self-heals), an escalation gate on delete, and the old count-based guard
removed because a protected root makes it both unreachable and wrong.

**Self-service account closure** (ADR 0012). `POST/DELETE /api/Users/me/closure`,
`AccountClosureService`, the hourly `account-anonymisation-sweep` Hangfire job, and
`CloseAccountSection` at the bottom of the account overlay's My Account panel. Closing soft-deletes
and schedules a scrub 30 days out; signing in cancels it; the scrub keeps the row and destroys the
person in it.

**Three dashboard list pages made one layout.** Actions live in the page header beside the h1; the
card holds the table and nothing else. Users-table columns gained `meta.priority` (ADR 0010).

**A build fix.** `QuizSessionService.cs:524` called a sync `BuildCompletedResult` that doesn't
exist; the prod Docker build was failing on it.

**The reminder email.** Three days before the scrub, `account-closure-reminder-sweep` mails everyone
still closing — once, stamped by `User.ClosureReminderSentAt`, button pointing at the login page
because logging in IS the recovery and the link therefore needs no token. Its own Hangfire job
rather than a branch of the anonymisation sweep, so an email outage can't take the scrub down with
it. `auth/account-closure.md` §6.

**Sign-in now says it cancelled a closure.** `AuthResponseDTO.ClosureCancelled`, turned into a
notice by `announceClosureCancelled` in `lib/Auth.tsx` — one place, so every sign-in path gets it.
**With that, the whole closure flow is finished**; `auth/account-closure.md` has no open items left.

**Tests: 311 → 342.** New: `Users/UserServiceDeleteTests.cs`, `Users/AccountClosureTests.cs`,
`Auth/AccountClosureLoginTests.cs`, `Auth/AccountClosureExternalLoginTests.cs`,
`Users/EmailReservationTests.cs`, `Users/ClosureReminderTests.cs`.

---

## OPEN — in the order I'd take them

1. **Multiplayer persistence** — the biggest remaining piece. Fully designed, nothing built. Its own
   section below.
2. **Inherited, unverified this session:** `GET /api/users/{id}`, `/username/{username}` and
   `POST /api/users/batch` are `[Authorize]` but still return the full `UserDTO` including email to
   any signed-in user. A slim DTO would be the fix. Also: background music is silent until an audio
   file is dropped at `public/audio/background-music.mp3`, and `/users/:userId` public profile is
   scaffolded but unlinked.

---

## Multiplayer persistence — designed, not built

The authority is [`quiz/multiplayer-persistence-plan.md`](quiz/multiplayer-persistence-plan.md).
This is the summary; read that before writing code, because the reasoning for each decision is there
and not repeated here.

**Today a match writes nothing.** `MatchOrchestrator.GradeRoundAsync` builds `UserAnswer` objects
purely to hand to `IAnswerGradingService` and never attaches them to a `DbContext`. No `QuizSession`
row is created. `ResetToLobbyAsync` wipes the scoreboard when the match ends. So: no history, no
record a match happened, **zero effect on quiz analytics or personal stats** (both read
`QuizSessions` + `UserAnswers`), and a player can never see which questions they got wrong.

**The decided shape** — one `Match` header row, plus **the same `QuizSession` and `UserAnswer` rows
single player already writes**, one session per player. Three players finishing a 5-question match
on quiz 12 produce 1 `Match`, 3 `QuizSession` (each with `Mode = Multiplayer` and `MatchId`), and 15
`UserAnswer`. The point is that multiplayer stops being a parallel universe: analytics, stats and the
results pages keep working without being taught what a match is. A separate
`Match`/`MatchParticipant`/`MatchAnswer` set of tables was considered and rejected — it means a
second reader for every consumer, forever.

**Decisions already taken** (all argued out; don't relitigate without reading the plan):

- Multiplayer plays are **excluded from a quiz's analytics by default**, with a mode filter to
  include or split. A fixed clock and social pressure depress scores for reasons unrelated to
  question quality, and the author's average score is their signal for exactly that.
- They **are** included in personal stats. The player played; it counts.
- The results page is **permanent, and is the single-player page**. `/quiz/results/:sessionId` and
  `/quiz/results/:sessionId/review` already exist and already render a session's overview and
  per-question breakdown — a match's per-player session gets those URLs for free.
- **Everyone in a match can see everyone's answers, permanently**, via a tab per player.
- A **rematch is a new `Match` row**. The lobby persists across it; the match does not.
- A **mid-match disconnect** records the answers given and marks the rest as not answered. Most of
  the mechanism already exists — `OnDisconnectedAsync` has a 5-second grace so refreshes survive,
  and `GradeRoundAsync` iterates live participants, so someone who left just stops appearing. What's
  missing is only a status distinguishing "played and got these wrong" from "wasn't there".

**Six work items**, in the plan doc: migration; `MatchOrchestrator` saving (once at match end, not
per round); `AbandonedSessionSweeper` skipping `Mode = Multiplayer` or it will flag finished matches
as abandoned; the resume path refusing multiplayer sessions; `ReportService` gaining a mode filter;
the review screen growing player tabs.

**One question still open:** whether a `Match` survives its quiz being soft-deleted. It doesn't block
the first four work items — the default (it survives, like sessions do) is reversible.

**No guests to worry about:** `QuizHub` is `[Authorize]`, so every participant is a real account.

---

## Working constraints in that session (may not apply to yours)

The assistant's shell could not mount the repo (a Windows update from 2026-09-08 broke the Plan9
share), so **it could not run `git`, `dotnet`, or `npm`**. It edited files by staging them into its
container and committing them back, and the user ran every build, test, migration and commit by
hand. If your shell can reach the repo, ignore all of this. If it can't, that is the workaround.

Two habits that came out of it and are worth keeping either way:

- **Adding a constructor parameter breaks positional test call sites**, and C# reports the error
  against the *last* parameter, not the one you added. Grep the test project.
- **A mocked method you rename leaves a stale stub that keeps tests green.** Two login tests were
  asserting nothing for exactly this reason. `testing.md` §4E has the rule.

---

## Conventions

- **Data fetching:** one file per endpoint exposing `getX`, `getXQueryOptions`, and a `useXData`
  hook (TanStack Query). Pagination is header-based for questions/quizzes
  (`extractPaginationFromHeaders`) but body-based for audit logs.
- **Permissions:** granular `resource:action[:own|:any]`. Backend
  `PermissionService.HasPermissionAsync` / `CanActOnResourceAsync`; frontend `authorization.tsx`
  mirrors it; **SuperAdmin bypasses all checks**. `/me` and login responses carry a flat
  `permissions[]`.
- **Role rules live in `Services/Roles/RoleRules.cs`** — `SuperAdminOnlyRoles` and `IsElevated`.
  Anything that grants or removes privilege reads them, so the rules can't drift between role
  changes, invite codes and deletion.
- **Two dashboards:** admin `/dashboard/*` (adminAuthLoader) and user `/my-dashboard/*`
  (userAuthLoader). User pages use self-scoped endpoints (`/questions/myQuestions`, `/quiz/my`).
- **Settings:** per-user `UserSettings`, `GET/PUT /api/settings`, applied app-wide by
  `src/common/SettingsApplier.tsx`. Account settings are sections of the account **overlay**
  (`docs/development/account-overlay.md`), not a standalone page.
- **Audit logging:** `IAuditService.LogAsync` (never throws, call AFTER save), verbs from
  `Services/Audit/AuditActions.cs`. Docs in `docs/development/audit-logging.md`.
- **Recurring work is Hangfire**, registered via `IRecurringJobManager` in `Program.cs` — and as of
  2026-09-13 that is the ONLY scheduler: the one `AddHostedService` left in the project ran the
  abandonment sweep a second time, on its own timer, and has been removed. Background work in this
  codebase has failed both ways — a `BackgroundService` nobody registered that never ran once, and
  a registered one nobody noticed duplicating a Hangfire job — so when something "isn't happening",
  check what is actually scheduled before reading any other code.
- **Documenting changes:** `docs/adr/` for hard-to-reverse decisions (append-only, supersede rather
  than edit); `docs/<area>/*.md` for how something behaves **today**; plan docs are transient. Full
  version in `docs/development/documenting-changes.md`.
- **Commits:** short. Subject plus a few lines saying what broke and what changed.
