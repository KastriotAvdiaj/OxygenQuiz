# Dynamic Reports

Criteria-driven reports over the signed-in user's **own** content (the quizzes and questions they
created). Each report can be previewed on screen and **exported** to CSV / Excel / JSON, reusing
the existing export framework (`IDataExportService`).

## Reports

- **Quiz Performance** — per quiz you own: attempts, completed, abandoned, completion %, average
  score (over completed attempts), average duration. Built from `QuizSessions`. A *completion*
  means a session that was genuinely finished — sessions abandoned by timeout are flagged
  `IsCompleted` internally but are **excluded** from "completed", the completion rate, and the
  score/duration averages (otherwise an abandoned session's idle time would skew the duration).
- **Question Analytics** — per question you own: times used in quizzes, times answered, correct /
  incorrect counts, correct %. Built from `UserAnswers` joined through `QuizQuestions`.

Both list **all** of your owned items (so an item with no activity still shows with zeros); the
date criteria filter only the activity counted within each row.

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

## API (`api/reports`, `[Authorize]`, scoped to the current user)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/reports/quiz-performance?from=&to=` | Quiz-performance rows (JSON, for the preview table) |
| POST | `/api/reports/quiz-performance/export?format=csv\|excel\|json` | Format the posted rows into a download |
| GET | `/api/reports/question-analytics?from=&to=` | Question-analytics rows (JSON) |
| POST | `/api/reports/question-analytics/export?format=...` | Format the posted rows into a download |

The `/export` endpoints take the row list as the JSON body (the rows the client is displaying) and
return the file. `format` stays a query-string param.

## Files

**Backend**
- `DTOs/Reports/ReportDtos.cs` — `ReportCriteria`, `QuizPerformanceRow`, `QuestionAnalyticsRow`.
- `Services/Reports/IReportService.cs` + `ReportService.cs` — the cross-aggregate analytical
  queries (sessions × quizzes, answers × questions). Reporting is a read-model that legitimately
  spans aggregates, so it lives in one service rather than the per-entity repositories.
- `Controllers/Reports/ReportsController.cs` — preview + export endpoints; export delegates to
  `IDataExportService`.
- `Program.cs` — `IReportService` registered (scoped).

**Frontend** (under `/my-dashboard/reports`)
- `src/pages/UserDashboard/api/reports.ts` — fetch rows (GET) + POST the visible rows to download.
- `src/pages/UserDashboard/MyReports.tsx` — report-type tabs, date criteria, Generate → table,
  on-screen filters (search + Type/Category), Export dropdown (CSV/Excel/JSON) over the filtered rows.
- Wired into the router (`reports` child) and the user-dashboard nav.

## Extending

A new report = a row DTO + a `ReportService` method + two controller endpoints (preview + export)
+ a column set in `MyReports.tsx`. The export half is free — any flat row list works with
`IDataExportService`. Natural next reports: User Activity, Quiz Attempts log (both noted earlier).

> Scope: reports are **per-user (own data)**. To offer org-wide analytics later, add admin-scoped
> variants (drop the `userId` filter) behind an `[Authorize(Roles = "Admin,SuperAdmin")]` gate.
