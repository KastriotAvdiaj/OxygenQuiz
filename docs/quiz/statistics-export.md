# Statistics export

> **Status: not shipped.** The screen is unfinished, so no route reaches it. Its UI is parked as
> `src/pages/UserDashboard/StatisticsExport.tsx` with its API client in
> `src/pages/UserDashboard/api/statistics.ts`; the backend endpoints, `StatisticsService` and the
> export framework are live, and the rest of this document describes them. To ship it, add an
> admin route in `src/routes/Router.tsx` pointing at `StatisticsExport`.
>
> **Renamed from "Reports"** (2026-10-24). "Report" now means one thing in this codebase: a
> viewer's report of a question or quiz ([`../media/moderation.md`](../media/moderation.md)), and
> `/dashboard/reports` and `/my-dashboard/reports` are those reports' pages. The endpoints moved
> from `api/reports/*` to `api/statistics/*`, and the classes from `Report*` to `Statistics*`.

Criteria-driven statistics over the signed-in user's **own** content (the quizzes and questions they
created). Each report can be previewed on screen and **exported** to CSV / Excel / JSON, reusing
the existing export framework (`IDataExportService`).

## The two exports

- **Quiz Performance** — per quiz you own: attempts, completed, abandoned, completion %, average
  score (over completed attempts), average duration. Built from `QuizSessions`. A *completion*
  means a session that was genuinely finished — sessions abandoned by timeout are flagged
  `IsCompleted` internally but are **excluded** from "completed", the completion rate, and the
  score/duration averages (otherwise an abandoned session's idle time would skew the duration).
- **Question Analytics** — per question you own: times used in quizzes, times answered, correct /
  incorrect counts, correct %. Built from `UserAnswers` joined through `QuizQuestions`.

Both list **all** of your owned items (so an item with no activity still shows with zeros); the
date criteria filter only the activity counted within each row.

**Classic quizzes only.** Quiz Performance lists your Classic quizzes and counts their sessions; an
Associations board is left out, explicitly (`Format == Classic` in `StatisticsService`), because its
scores and durations are on another scale. The single-quiz analytics count Classic sessions only
for the same reason — the analytics page already shows "not available" for a board. Board analytics
are planned ([`associations.md`](./associations.md) §9.7).

## Criteria

`from` / `to` (both optional, applied **server-side** when previewing). Dates are read
**inclusively** — `to` covers the whole selected day. Empty = all-time.

## On-screen filters (and export parity)

After a report is generated, the table can be narrowed **client-side**: a text search (quiz title
/ question text) plus Type and Category dropdowns for Question Analytics. These filters are applied
in the browser to the previewed rows.

**Export reflects exactly what's on screen.** Rather than re-querying, the export endpoints take
the currently-visible (filtered) rows in the request body and run them straight through
`IDataExportService`. This guarantees the download matches the table — including search/filter —
and avoids the filter logic drifting between the preview and the export. (Previously export
re-queried with only the dates, so any on-screen filtering was silently ignored.)

## API (`api/statistics`, `[Authorize]`, scoped to the current user)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/statistics/quiz-performance?from=&to=` | Quiz-performance rows (JSON, for the preview table) |
| POST | `/api/statistics/quiz-performance/export?format=csv\|excel\|json` | Format the posted rows into a download |
| GET | `/api/statistics/question-analytics?from=&to=` | Question-analytics rows (JSON) |
| POST | `/api/statistics/question-analytics/export?format=...` | Format the posted rows into a download |

The `/export` endpoints take the row list as the JSON body (the rows the client is displaying) and
return the file. `format` stays a query-string param.

## Files

**Backend**
- `DTOs/Statistics/StatisticsDtos.cs` — the criteria and the `QuizPerformanceRow` / `QuestionAnalyticsRow` rows.
- `Services/StatisticsExport/IStatisticsService.cs` + `StatisticsService.cs` — the cross-aggregate analytical
  queries (sessions × quizzes, answers × questions). Reporting is a read-model that legitimately
  spans aggregates, so it lives in one service rather than the per-entity repositories.
- `Controllers/Statistics/StatisticsController.cs` — preview + export endpoints, plus the single
  quiz's analytics (`GET /api/statistics/quiz/{id}/analytics`, used by the quiz page); export
  delegates to `IDataExportService`.
- `Program.cs` — `IStatisticsService` registered (scoped).

**Frontend** (parked — no route)
- `src/pages/UserDashboard/api/statistics.ts` — fetch rows (GET) + POST the visible rows to download.
- `src/pages/UserDashboard/StatisticsExport.tsx` — export-type tabs, date criteria, Generate → table,
  on-screen filters (search + Type/Category), Export dropdown (CSV/Excel/JSON) over the filtered rows.

## Extending

A new export = a row DTO + a `StatisticsService` method + two controller endpoints (preview + export)
+ a column set in `StatisticsExport.tsx`. The export half is free — any flat row list works with
`IDataExportService`. Natural next reports: User Activity, Quiz Attempts log (both noted earlier).

> Scope: statistics are **per-user (own data)**. To offer org-wide analytics later, add admin-scoped
> variants (drop the `userId` filter) behind an `[Authorize(Roles = "Admin,SuperAdmin")]` gate.
