import { LineChart, Construction } from "lucide-react";

/**
 * `/dashboard/reports` — placeholder.
 *
 * The reports feature is **built, not deleted**: the UI lives in
 * `src/pages/UserDashboard/MyReports.tsx`, its API client in
 * `src/pages/UserDashboard/api/reports.ts`, and the backend endpoints, `ReportService` and
 * the export framework are all intact and documented in `docs/quiz/reports.md`.
 *
 * It was pulled from the user dashboard because it isn't finished and isn't something a
 * player needs — reporting is an operator concern. Rather than ship a half-done screen or
 * throw the work away, the nav entry moved here and the route renders this until the
 * feature is polished.
 *
 * **To bring it back:** point the `reports` route in `src/routes/Router.tsx` at `MyReports`
 * instead of this component. Nothing else needs restoring.
 */
export const ReportsComingSoon = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
    <div className="relative mb-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
        <LineChart
          className="h-8 w-8 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
      <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background">
        <Construction
          className="h-4 w-4 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </span>
    </div>

    <h1 className="text-2xl font-bold">Reports</h1>
    <p className="mt-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
      Coming soon
    </p>

    <p className="mt-4 max-w-md text-sm text-muted-foreground">
      Quiz performance and question analytics, with CSV, Excel and JSON export. The
      groundwork is in place — the reporting screen is being finished before it ships.
    </p>
  </div>
);
