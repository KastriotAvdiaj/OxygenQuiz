import { forwardRef, useCallback, useState } from "react";
import { Activity, ListFilter, SearchX } from "lucide-react";
import { DataTable, LoadingWave } from "@/components/ui";
import { PaginationControls } from "@/components/ui/pagination-control";
import { ActiveFilterPills } from "@/components/ui/active-filter-pills";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import { cn } from "@/utils/cn";
import { useUserSessions } from "@/pages/Quiz/Sessions/api/get-user-sessions";
import { QuizToolbar } from "@/pages/Quiz/components/quiz-header";
import { useQuestionCategoryData } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import {
  HISTORY_SORT_LABELS,
  QuizHistoryFilterPanel,
  useQuizHistoryFilters,
} from "./quiz-history-filters";
import { quizHistoryColumns } from "./quiz-history-columns";

// A server page. Twenty rows of a table is one comfortable screen at desk height.
const PAGE_SIZE = 20;

/**
 * Everything the play history needs — filter state, the lookups its facets and pills label
 * from, the current server page — with no markup. Two shells render it: `QuizHistoryList`
 * below (the profile: toolbar + filter drawer) and `MyQuizHistory` (the dashboard: toolbar in
 * the table card, filters in a sidebar like My Quizzes). See docs/quiz/user-stats-history.md.
 */
export function useQuizHistory(userId: string) {
  const [page, setPage] = useState(1);
  const resetPage = useCallback(() => setPage(1), []);

  // Option lists for the facets and their pills — the API filters by id, not by name.
  const { data: categories = [] } = useQuestionCategoryData({});
  const { data: difficulties = [] } = useQuestionDifficultyData({});
  const { data: languages = [] } = useQuestionLanguageData({});
  const lookups = { categories, difficulties, languages };

  const filters = useQuizHistoryFilters(lookups, resetPage);

  const sessionsQuery = useUserSessions({
    userId,
    query: { ...filters.query, page, pageSize: PAGE_SIZE },
  });

  const { data, isLoading, isError } = sessionsQuery;
  const sessions = data?.items ?? [];
  const isFiltering = filters.activeCount > 0;

  return {
    lookups,
    filters,
    sessionsQuery,
    sessions,
    setPage,
    isFiltering,
    // Someone with no plays at all gets the plain empty state — a search box over nothing is noise.
    hasNoPlays: !isLoading && !isError && sessions.length === 0 && !isFiltering,
  };
}

export type QuizHistoryState = ReturnType<typeof useQuizHistory>;

/** "No quizzes played yet" — shown instead of the toolbar and table, by either shell. */
export const QuizHistoryEmpty = () => (
  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
    <Activity className="mb-3 h-8 w-8 opacity-50" />
    <p className="font-medium">No quizzes played yet</p>
    <p className="text-sm">Sessions you play will show up here.</p>
  </div>
);

/** Search + sort. `filterAction` is the drawer trigger, where the shell has one. */
export const QuizHistoryToolbar = ({
  history,
  filterAction,
  showSearch = true,
}: {
  history: QuizHistoryState;
  filterAction?: React.ReactNode;
  /** Off on the dashboard, whose search lives in the filter sidebar (which also clears it). */
  showSearch?: boolean;
}) => {
  const { filters, sessionsQuery } = history;
  return (
    <QuizToolbar
      searchQuery={filters.search}
      onSearchChange={filters.setSearch}
      searchPlaceholder="Search your history..."
      sortBy={filters.sort}
      onSortChange={filters.setSort}
      sortOptions={HISTORY_SORT_LABELS}
      resultCount={sessionsQuery.data?.totalItems ?? 0}
      showCount={false}
      activeFilterCount={filters.activeCount}
      onClearFilters={showSearch ? filters.clearAll : undefined}
      filterAction={filterAction}
      showSearch={showSearch}
    />
  );
};

/**
 * The drawer trigger the profile uses — and the dashboard below `lg`, where its sidebar hides.
 * Forwards ref and props so it works as a Radix `asChild` trigger.
 */
export const QuizHistoryFilterButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { count: number }
>(({ count, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-foreground/25",
      className
    )}
    {...props}
  >
    <ListFilter className="h-4 w-4 text-muted-foreground" />
    Filters
    {count > 0 && (
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-white">
        {count}
      </span>
    )}
  </button>
));
QuizHistoryFilterButton.displayName = "QuizHistoryFilterButton";

/**
 * Active-filter pills, then the table and pager — or the loading / error / no-match states.
 * `tone` follows the surface: `"neutral"` on the tinted profile page, `"primary"` inside the
 * dashboard's card so it matches the My Quizzes table beside it.
 */
export const QuizHistoryResults = ({
  history,
  tone = "neutral",
}: {
  history: QuizHistoryState;
  tone?: "primary" | "neutral";
}) => {
  const { filters, sessionsQuery, sessions, setPage, isFiltering } = history;
  const { data, isLoading, isError, isPlaceholderData } = sessionsQuery;

  return (
    <>
      {isFiltering && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {(data?.totalItems ?? 0).toLocaleString()}{" "}
            {data?.totalItems === 1 ? "session" : "sessions"}
          </span>
          {/* No "Clear all" here — the toolbar's Clear already does that. */}
          <ActiveFilterPills pills={filters.pills} />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingWave size="sm" />
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Your history couldn't be loaded right now.
        </p>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <SearchX className="mb-3 h-8 w-8 opacity-50" />
          <p className="font-medium">No sessions match these filters</p>
          <button
            type="button"
            onClick={filters.clearAll}
            className="mt-1 text-sm underline underline-offset-4 hover:text-foreground"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* A table rather than cards: history is for comparing plays — score against score,
              date against date — and columns line those up. Dimmed while the next result set
              loads (the previous one stays up — keepPreviousData). */}
          <div className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <DataTable
              data={sessions}
              columns={quizHistoryColumns}
              tone={tone}
              density="compact"
            />
          </div>

          {/* The app's standard pagination; it hides itself when there is only one page. */}
          <PaginationControls
            pagination={data ? pagedResponseToPagination(data) : undefined}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
};

/**
 * Paginated, filterable play history for the profile page, as a `DataTable`
 * (quiz-history-columns.tsx). Rows link to the existing results page, which already renders the
 * per-question review — no new detail view needed.
 *
 * Filters open in a drawer at every width: the profile has no room for a permanent sidebar.
 * The dashboard's `/my-dashboard/history` does, and composes the same pieces around one —
 * see MyQuizHistory.tsx and docs/quiz/user-stats-history.md.
 */
export const QuizHistoryList = ({ userId }: { userId: string }) => {
  const history = useQuizHistory(userId);

  if (history.hasNoPlays) return <QuizHistoryEmpty />;

  return (
    <div className="space-y-3">
      <QuizHistoryToolbar
        history={history}
        filterAction={
          <Sheet>
            <SheetTrigger asChild>
              <QuizHistoryFilterButton count={history.filters.panelCount} />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-80 max-w-[85vw] overflow-y-auto px-4 pb-4 pt-12"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Filter history</SheetTitle>
              </SheetHeader>
              <QuizHistoryFilterPanel lookups={history.lookups} state={history.filters} />
            </SheetContent>
          </Sheet>
        }
      />
      <QuizHistoryResults history={history} />
    </div>
  );
};
