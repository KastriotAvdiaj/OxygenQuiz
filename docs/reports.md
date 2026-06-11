# Dynamic Reports

Criteria-driven reports over the signed-in user's **own** content (the quizzes and questions they
created). Each report can be previewed on screen and **exported** to CSV / Excel / JSON, reusing
the existing export framework (`IDataExportService`).

## Reports

- **Quiz Performance** — per quiz you own: attempts, completed, abandoned, completion %, average
  score (over completed attempts), average duration. Built from `QuizSessions`.
- **Question Analytics** — per question you own: times used in quizzes, times answered, correct /
  incorrect counts, correct %. Built from `UserAnswers` joined through `QuizQuestions`.

Both list **all** of your owned items (so an item with no activity still shows with zeros); the
date criteria filter only the activity counted within each row.

## Criteria

`from` / `to` (both optional). Dates are read **inclusively** — `to` covers the whole selected
day. Empty = all-time.

## API (`api/reports`, `[Authorize]`, scoped to the current user)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/reports/quiz-performance?from=&to=` | Quiz-performance rows (JSON, for the preview table) |
| GET | `/api/reports/quiz-performance/export?from=&to=&format=csv\|excel\|json` | Download the report |
| GET | `/api/reports/question-analytics?from=&to=` | Question-analytics rows (JSON) |
| GET | `/api/reports/question-analytics/export?from=&to=&format=...` | Download the report |

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
- `src/pages/UserDashboard/api/reports.ts` — fetch rows + download export.
- `src/pages/UserDashboard/MyReports.tsx` — report-type tabs, date criteria, Generate → table,
  Export dropdown (CSV/Excel/JSON).
- Wired into the router (`reports` child) and the user-dashboard nav.

## Extending

A new report = a row DTO + a `ReportService` method + two controller endpoints (preview + export)
+ a column set in `MyReports.tsx`. The export half is free — any flat row list works with
`IDataExportService`. Natural next reports: User Activity, Quiz Attempts log (both noted earlier).

> Scope: reports are **per-user (own data)**. To offer org-wide analytics later, add admin-scoped
> variants (drop the `userId` filter) behind an `[Authorize(Roles = "Admin,SuperAdmin")]` gate.
