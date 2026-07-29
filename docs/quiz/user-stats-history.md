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

## Endpoints

| Route | Returns | Access |
|---|---|---|
| `GET /api/users/{id}/quiz-stats` | `UserQuizStatsDto` | owner or admin |
| `GET /api/QuizSessions/user/{userId}?page=&pageSize=` | `PagedResponse<QuizSessionSummaryDto>` | owner or admin |
| `GET /api/userAnswers/session/{sessionId}` | `List<UserAnswerDto>` (per-question review — pre-existing) | session owner |

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
var query = _context.QuizSessions
    .AsNoTracking()
    .Where(s => s.UserId == userId && !s.IsGuestSession)
    .OrderByDescending(s => s.StartTime)
    .Select(QuizSessionMappers.ProjectSummary);

return await PagedResponse<QuizSessionSummaryDto>.CreateAsync(query, page, pageSize);
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

Page size is clamped server-side (`QuizSessionService.MaxHistoryPageSize`); a client asking for
`pageSize=100000` gets 50.

## Frontend

```
src/pages/Quiz/Sessions/api/get-user-sessions.ts        history (canonical home for this call)
src/pages/UserRelated/Profile/api/get-user-quiz-stats.ts stats
src/pages/UserRelated/Profile/components/QuizHistoryList.tsx
src/pages/UserRelated/Profile/ProfileView.tsx           presentational, props only
src/pages/UserRelated/Profile/MyProfile.tsx             container: fetches, passes down
```

Conventions this follows:

- **Container fetches, view renders.** `ProfileView` takes `quizStats` and `userId` as props and
  stays presentational, so it still serves both the private and public profile from one component.
  `MyProfile` (the self container) is the only place that calls the owner-only endpoints.
- **Privacy mirrors the API.** Stats and history render only when `isOwnProfile`. A public profile
  shows "—" and a "History is private" panel rather than firing a request that would 403.
- **One query key per resource+page** (`["user-sessions", userId, page, pageSize]`) with
  `placeholderData: keepPreviousData`, so paging doesn't collapse the list into a spinner.
- History rows link to the existing `/quiz/results/{sessionId}` page — the per-question review
  already exists, so the feature adds no second detail view.

The old `getUserSessions` helper that lived inside `resume-quiz-session.ts` is now
`findActiveSessionForQuiz`, a named intent that reads the first page of the shared history endpoint.
The resume flow only ever wanted "my in-progress session for this quiz", which is by definition the
most recent one.

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
| Index + score rescale | `Migrations/20260728120000_RescaleScoresToHighResolutionBase.cs` |
