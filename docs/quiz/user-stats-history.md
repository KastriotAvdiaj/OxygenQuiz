# Quiz History & Player Stats

How a user's past sessions and aggregate play statistics are read, computed, and shown on the
profile. Nothing here writes data — the whole feature is a read-side view over records that
[quiz-grading.md](quiz-grading.md) already persists.

## What the data already looked like

No new tables, no new columns. Everything is derived from what live play writes:

| Entity | Relevant fields |
|---|---|
| `QuizSession` | `UserId`, `QuizId`, `StartTime`, `EndTime`, `TotalScore`, `IsCompleted`, `AbandonmentReason`, `AbandonedAt`, `IsGuestSession`, `QuizVersion` |
| `UserAnswer` | `SessionId`, `Status` (Correct / Incorrect / TimedOut / Pending / NotAnswered), `Score`, `QuestionStartTime`, `SubmittedTime` |

Two rules apply to every query in this feature:

- **Guest sessions are excluded** (`!IsGuestSession`). They belong to the shared guest account, are
  deleted as soon as the guest views their results, and are nobody's history — see
  [guest-play.md](../auth/guest-play.md).
- **Abandoned ≠ completed.** A session with an `AbandonmentReason` is reported separately and kept
  out of score/accuracy averages, matching the analytics convention in [reports.md](reports.md).
  A half-finished quiz's `TotalScore` would otherwise drag every average down.

One rule is **not** shared, on purpose: sessions on a **soft-deleted quiz** are hidden from the
history list but still counted by the stats. A deleted quiz's results page 404s, so a history row
for it would be a dead link; the play itself still happened, so the totals keep it. Expect
"Quizzes played" to exceed the history count for anyone who played a quiz that was later deleted.

## Endpoints

| Route | Returns | Access |
|---|---|---|
| `GET /api/users/{id}/quiz-stats` | `UserQuizStatsDto` | owner or admin |
| `GET /api/QuizSessions/user/{userId}?search=&filter=&sort=&page=&pageSize=` | `PagedResponse<QuizSessionSummaryDto>` | owner or admin |
| `GET /api/userAnswers/session/{sessionId}` | `List<UserAnswerDto>` (per-question review — pre-existing; answer key withheld mid-quiz, see [quiz-grading.md](quiz-grading.md)) | owner or admin — since 2026-09-26; it was anonymous before |

Both new/changed routes enforce the same rule: **your own data only**, admins may view anyone's.
Play history reveals activity patterns, so it is deliberately *not* part of the public profile
(`GET /api/users/{id}/profile`).

### `UserQuizStatsDto`

```
QuizzesPlayed            completed, non-abandoned, non-guest sessions
DistinctQuizzesPlayed    distinct QuizIds among those
QuizzesAbandoned         sessions carrying an AbandonmentReason
TotalQuestionsAnswered   graded answers (Pending / NotAnswered excluded)
TotalCorrectAnswers
AccuracyPercent          correct / graded
AverageScore             mean TotalScore over completed sessions
BestScore
AverageAnswerTimeSeconds mean (SubmittedTime − QuestionStartTime)
LastPlayedAt
```

`AverageAnswerTimeSeconds` is honest think time, not think time + ping: `SubmittedTime` stores the
**latency-compensated** elapsed the answer was scored with (see
[quiz-grading.md](quiz-grading.md#latency-compensated-timing)).

## Computed on read, not denormalised

`UserStatsService` runs **three grouped aggregates in SQL** (sessions, completed-session scores,
answers) and materialises only the aggregate rows. There are no counter columns on `User`, and
nothing on the write path knows this feature exists.

One deliberate exception: **average answer time is computed in memory.** Npgsql can't translate
`TimeSpan.TotalSeconds` over a `DateTime` difference, so the two timestamp columns of the user's
own answered questions are read and subtracted in C# — the same approach `ReportService` already
takes for durations. Only two `DateTime` columns are projected (no entities, no navigations). If
that ever becomes hot, the fix is a persisted elapsed-ms column written at submit time, not a
cleverer query.

Why this way:

- **Correctness by construction.** Denormalised counters need every mutation path — instant
  grading, the Hangfire background grader, abandonment cleanup, session deletion, quiz-version
  edits — to remember to update them. Any missed path silently corrupts a number that nobody
  notices is wrong. The aggregate cannot drift because there is nothing to drift from.
- **The write path stays simple.** Answer submission is already the most timing-sensitive code in
  the app; adding counter bookkeeping inside its transaction buys nothing.
- **The cost is bounded and indexed.** Sessions are filtered by `UserId` and answers reach the user
  through their session FK, both indexed.

If profile loads ever get slow, the upgrade path — in order — is:

1. `IMemoryCache` with a short TTL keyed on user id (stats tolerate being seconds stale);
2. a materialised view refreshed on a schedule;
3. only as a last resort a `UserStatsSnapshot` table, updated on session completion.

Reach for **caching before counters**: caching can be wrong for 30 seconds, counters can be wrong
forever.

### The index

`RescaleScoresToHighResolutionBase` creates:

```sql
CREATE INDEX IF NOT EXISTS "IX_QuizSessions_UserId_IsCompleted_StartTime"
ON "QuizSessions" ("UserId", "IsCompleted", "StartTime" DESC);
```

It covers both read paths — the stats aggregate (filter on user + completion) and the history list
(filter on user, sort by start time descending). It's created via raw SQL and kept out of the EF
model on purpose: it is a pure read optimisation, and the model shouldn't carry knowledge that
exists only to serve one query plan.

## The history list query (and the N+1 it replaced)

`GetUserSessionsAsync` **projects to the DTO inside the query** using the shared
`QuizSessionMappers.ProjectSummary` expression, so per-session question and answer counts are computed
by the database:

```csharp
IQueryable<QuizSession> sessions = _context.QuizSessions
    .AsNoTracking()
    .Where(s => s.UserId == userId && !s.IsGuestSession && s.Quiz.DeletedAt == null);

sessions = FilterEngine.Apply(sessions, query, QuizSessionFilterFields.Fields);  // see "Filtering"
// + ThenByDescending(StartTime).ThenBy(Id) as a tie-breaker

return await PagedResponse<QuizSessionSummaryDto>.CreateAsync(
    sessions.Select(QuizSessionMappers.ProjectSummary), query.Page, query.PageSize);
```

The previous implementation did `Include(Quiz).ThenInclude(QuizQuestions).Include(UserAnswers)` and
then mapped in memory — it loaded **every question and every answer of every quiz the user had ever
played** in order to produce two integers per row, and returned the entire unpaginated history. Cost
grew with lifetime play count on every profile view. Two lessons worth keeping:

- **`Include` is for data you will use; `Select` is for data you will count.** If a value ends up as
  a number in a DTO, project it — don't hydrate the graph and count objects.
- **Any list that grows without bound must be paginated at the API,** not trimmed in the UI.

`TotalQuestions` respects the session's pinned `QuizVersion`, so a quiz edited after you played it
doesn't retroactively change your score's denominator — see [quiz-editing.md](quiz-editing.md).

### Why the deleted-quiz filter is explicit

The `Quiz` entity has a global query filter (`DeletedAt == null`), so it is tempting to assume
deleted quizzes are already out of the picture. They weren't. `ProjectSummary` reads `s.Quiz`, and
with `Skip/Take` EF pushes the paging into a subquery over `QuizSessions` and only then INNER JOINs
the filtered `Quizzes` — so a deleted quiz's rows were dropped **after** the `LIMIT`. `CountAsync`
never joins at all, so it still counted them. The symptom (2026-09-26): 24 requested, 22 cards on
page 1, and a pager offering a page that came back empty.

Filtering on `s.Quiz.DeletedAt == null` in the `Where` puts the same condition in front of both the
count and the page. General rule: **when a paged projection navigates to a filtered entity, filter
on it explicitly** — the global filter alone makes count and page disagree. Covered by
`QuizAPI.Tests/Playing/SessionHistoryPagingTests.cs`.

Page size is clamped server-side (`QuizSessionService.MaxHistoryPageSize`); a client asking for
`pageSize=100000` gets 50 (the generic `FilterQuery` cap is 100; history keeps its own).

## Filtering the history

Added 2026-09-26. The endpoint binds the standard `FilterQuery` from
[filtering.md](filtering.md) — nothing history-specific in the wire format — against a
whitelist in `Controllers/Quizzes/QuizSessionFilterFields.cs`:

| Field | Operators | Notes |
|---|---|---|
| `quizTitle` | contains, startsWith, eq | the only **searchable** field, so `search=` matches quiz titles; sortable |
| `quizId` | eq, in | used by the resume flow |
| `categoryId`, `difficultyId`, `languageId` | eq, in | **the same names as `QuizFilterFields`**, read through `s.Quiz` |
| `status` | eq, in | derived `SessionHistoryStatus`: `InProgress`=0, `Completed`=1, `Abandoned`=2 |
| `totalScore` | gte, lte, between | sortable (raw points) |
| `accuracy` | — | sort-only: correct ÷ pinned question count, 0–1 (0 when the quiz has no questions) |
| `startTime` | eq, gt, gte, lt, lte, between | sortable, **default sort (desc)** |

The user / guest / deleted-quiz clamp runs **before** the client's filters, so query params can
only narrow within the caller's own reachable sessions (same pattern as `mine/search`).

Decisions worth knowing:

- **Facet field names match the quiz catalogue on purpose.** The frontend's
  `useQuizFilterState` already serializes category / difficulty / language to
  `categoryId:in:…` etc. for `/quiz/search`; because history whitelists the same names, the
  catalogue's facet state and panel were reused unchanged instead of writing a second set.
- **`status` is computed, not stored.** Its selector is a conditional
  (`AbandonmentReason != null ? Abandoned : IsCompleted ? Completed : InProgress`) that EF
  translates to a SQL `CASE`, so it filters in the database. Precedence matches the card's badge:
  abandoned sessions are also `IsCompleted = true`, and must still read as abandoned. The enum
  parses by name or number (`status:in:1,2` and `status:in:Completed,Abandoned` are equivalent).
- **Date ranges are half-open and in the viewer's timezone.** The UI sends
  `startTime:gte:<local midnight of From>` and `startTime:lt:<local midnight of the day after To>`
  as ISO instants. Sending bare `yyyy-mm-dd` would be read as UTC midnight (off by the viewer's
  offset) and, with `lte`, would drop everything on the "to" day after 00:00.
- **Ties are broken server-side.** `FilterEngine` only orders by the requested field; sorting by
  score alone has many ties, and ties make offset paging skip or repeat rows. The service appends
  `ThenByDescending(StartTime).ThenBy(Id)`.

Tests: `QuizAPI.Tests/Playing/SessionHistoryPagingTests.cs` (paging, search, facets, status
precedence, half-open dates, tie-breaking, the user clamp). Verified against PostgreSQL too — the
in-memory provider does not prove the `CASE` or the nested `s.Quiz.*` members translate.

## Frontend

```
src/pages/Quiz/Sessions/api/get-user-sessions.ts         history (canonical home for this call)
src/pages/UserRelated/Profile/api/get-user-quiz-stats.ts  stats
src/pages/UserRelated/Profile/components/QuizHistoryList.tsx
src/pages/UserRelated/Profile/components/quiz-history-filters.tsx   filter state + panel
src/pages/UserRelated/Profile/components/quiz-history-columns.tsx   table columns + score
src/pages/UserRelated/Profile/ProfileView.tsx             presentational, props only
```

### Where it renders

Three surfaces, deliberately split by how each is used:

| Surface | Shows | Fetches |
|---|---|---|
| `AccountOverlay/panels/StatsPanel.tsx` (`?settings=stats`) | stats only, plus a link to the history page | `useUserQuizStats` |
| `UserDashboard/MyQuizHistory.tsx` (`/my-dashboard/history`) | full paginated history | `useQuizHistory` → `useUserSessions` |
| `Profile/ProfileView.tsx` (`/users/:userId`) | both, owner only | props from `UserProfile` |

Stats and history used to sit together in the overlay. They were split because the overlay is
something you open over your current page and dismiss, while history is a list you scroll,
paginate and click into — and every click navigates away and closes the overlay anyway. The
panel's link is a plain `<Link>`; navigating to a path without `?settings=` closes the overlay
by itself (see [account-overlay.md](../development/account-overlay.md)).

`Profile/MyProfile.tsx` — the old self-profile container this section used to name — is a
retired stub. Its job moved into the overlay panels.

Conventions this follows:

- **One list implementation, two shells** (the dashboard page and the profile — the stats
  panel links to the list rather than mounting it). `QuizHistoryList.tsx` exports the pieces:
  `useQuizHistory(userId)` (paging, filters, lookups, the query), `QuizHistoryToolbar`,
  `QuizHistoryResults` (pills, table, pager, loading / error / no-match states) and
  `QuizHistoryEmpty`. The profile mounts `QuizHistoryList`, which arranges them with a filter
  drawer; the dashboard page arranges the same pieces in the My Quizzes shell — title row, the
  table in a `Card`, filters in a sticky `bg-background` sidebar from `lg` up and a sheet below
  it — so the three dashboard lists read as one set.
- **`ProfileView` stays presentational.** It takes `quizStats` and `userId` as props and serves
  both the private and public profile from one component; `UserProfile` is its only container.
- **Privacy mirrors the API.** On `ProfileView`, stats and history render only when
  `isOwnProfile` — a public profile shows "—" and a "History is private" panel rather than
  firing a request that would 403. The overlay panel and the dashboard page are behind auth
  loaders and always read the signed-in user's own id.
- **Stats degrade, they don't throw.** `getUserQuizStatsQueryOptions` sets
  `throwOnError: false`, so a missing or failing endpoint renders a message instead of taking
  the overlay down with it. Callers must treat `data` as possibly-undefined.
- **One query key per result set** (`["user-sessions", userId, <serialized FilterQuery>]`) with
  `placeholderData: keepPreviousData`, so paging or filtering doesn't collapse the list into a
  spinner — the previous results stay up, dimmed, until the next set lands.
- **A table, not cards** (2026-09-26). `QuizHistoryList` renders a `DataTable` with
  `quizHistoryColumns` (`quiz-history-columns.tsx`): Quiz, Score, Played, Correct, Status,
  Points, Duration, and a review link. History is for comparing plays, and columns line
  scores and dates up where cards scattered them. Priorities follow
  [ADR 0010](../adr/0010-a-narrow-table-drops-columns-it-does-not-scroll.md) — Quiz, Score and
  the link never hide; Points and Duration go behind the row chevron first — which matters
  because the same list renders in the narrower profile page. 20 rows a page, shared
  `PaginationControls` fed through `pagedResponseToPagination`.
  On the profile it uses `DataTable`'s `tone="neutral"`: a `bg-background` surface with rows
  alternating `muted` and `background`, instead of the dashboard tables' primary wash — the
  profile is a tinted page and the history reads as plain content there. On the dashboard it
  sits in a `Card` beside My Quizzes and uses the default `"primary"` tone like that table.
  Both use `density="compact"` (see [RESPONSIVE.md](../RESPONSIVE.md)): the score renders as
  number and bar on one line instead of stacked.
- **Score is /100, points are a column of their own.** The headline is the share of questions
  answered correctly × 100 — the same number the results page calls "Final Score"
  (`normalizedScore`), so a row never disagrees with the page it links to. Raw points
  (1000-point base + speed bonus × point-system multiplier, `QuizScoring.cs`) run to five
  digits and read as noise as a headline, so they sit in **Points**. An in-progress play shows
  "—" rather than a partial score; an abandoned one keeps its final score.
- **"Highest Score" sorts by the headline.** It sends `sort=accuracy:desc`, a sort-only field
  computed in SQL from the same two counts as `ProjectSummary`. It used to sort by
  `totalScore`, which ranks by quiz length as much as by performance (3/10 on a long quiz beat
  10/10 on a short one). "Most Points" still sorts by `totalScore`.
- **Filters are the catalogue's components.** Search + sort is `QuizToolbar`
  (`pages/Quiz/components/quiz-header.tsx`, which takes a `sortOptions` map so it can sort
  something other than quizzes); the drawer is `QuizFilterPanel` with the catalogue's
  `useQuizFilterState` facets, plus two history-only sections (Status, Played date range)
  passed through the panel's `children` slot. Active filters show as `ActiveFilterPills` with a
  result count. The profile opens the panel in a drawer at every width (no room for a
  sidebar), with search in the toolbar. The dashboard shows it as a sticky sidebar from `lg` up
  (a sheet below that) and, like My Quizzes' panel, puts the search field at the top of it
  (`showSearch` — the dashboard's `SearchInput`, submitted with Enter or its button); the
  toolbar there keeps only the sort, and the panel's "Clear all" clears the search too.
- **Status badges: finished plays are filled, unfinished ones outlined.** Completed is
  `bg-primary`, Abandoned `bg-destructive`, In progress an outlined primary badge — it is not a
  result yet.
- **Two empty states.** No plays at all → "No quizzes played yet" and no toolbar (a search box
  over nothing is noise). Plays, but none match → "No sessions match these filters" with a
  clear action, toolbar still visible.
- History rows link to the existing `/quiz/results/{sessionId}` page — the per-question review
  already exists, so the feature adds no second detail view.

The old `getUserSessions` helper that lived inside `resume-quiz-session.ts` is now
`findActiveSessionForQuiz`, a named intent on the shared history endpoint. It asks for exactly
the row it wants — `quizId:eq:<id>` + `status:eq:0`, one row. It used to read the first 20 sessions
and search them client-side, on the assumption that the active session is the most recent one. It
is only the most recent *for that quiz*: twenty plays of other quizzes since then pushed it off
the page and the lookup came back empty.

## Key files

| Concern | File |
|---|---|
| Stats aggregation | `Controllers/Users/Services/UserStatsService/UserStatsService.cs` |
| Stats DTO | `DTOs/Quiz/UserQuizStatsDto.cs` |
| Stats endpoint | `Controllers/Users/UsersController.cs` (`GET {id}/quiz-stats`) |
| History query + paging | `Controllers/Quizzes/Services/QuizSessionServices/QuizSessionService.cs` |
| History endpoint | `Controllers/Quizzes/QuizSessionsController.cs` (`GET user/{userId}`) |
| Summary projection | `Mapping/EntityMappers.cs` → `QuizSessionMappers.ProjectSummary` |
| Paging envelope | `Filtering/PagedResponse.cs` |
| History filter whitelist | `Controllers/Quizzes/QuizSessionFilterFields.cs` |
| History paging + filter tests | `QuizAPI.Tests/Playing/SessionHistoryPagingTests.cs` |
| History filter UI | `src/pages/UserRelated/Profile/components/quiz-history-filters.tsx` |
| Index + score rescale | `Migrations/20260728120000_RescaleScoresToHighResolutionBase.cs` |
