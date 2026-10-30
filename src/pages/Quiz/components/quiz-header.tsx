import { Search, ArrowUpDown, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/cn";

// The sort options live in quiz-sort.ts so a route loader can use them without this file's UI.
import type { SortOption } from "./quiz-sort";
export { DEFAULT_SORT, SORT_RULES, type SortOption } from "./quiz-sort";

const SORT_LABELS: Record<SortOption, string> = {
  variety: "Mixed Categories",
  newest: "Newest First",
  oldest: "Oldest First",
  "title-asc": "A → Z",
  "title-desc": "Z → A",
};

interface QuizToolbarProps<S extends string = SortOption> {
  searchQuery: string;
  onSearchChange: (value: string) => void;

  /** Placeholder / accessible name for the search box. Defaults to "Search quizzes…". */
  searchPlaceholder?: string;

  /**
   * Sort control — omit both to hide it (e.g. the multiplayer dialog, which
   * always uses the default "variety" sort to save space).
   */
  sortBy?: S;
  onSortChange?: (value: S) => void;

  /**
   * The sort menu, as value → label. Defaults to the quiz catalogue's options
   * (SORT_LABELS); lists that sort something else — the play history sorts
   * sessions by date and score — pass their own, with `S` inferred from it.
   */
  sortOptions?: Record<S, string>;

  resultCount: number;

  /**
   * How many filters (search text + facet selections) are currently active.
   * Drives the "Clear" action's visibility. Facet filters themselves live in
   * QuizFilterPanel (components/quiz-filters/) — the toolbar only reports them.
   */
  activeFilterCount?: number;

  /**
   * Whether to render the result count inside the toolbar (default true).
   * The quiz-selection page renders the count in its own results header instead.
   */
  showCount?: boolean;

  /**
   * Optional: when provided, a "Clear" action appears while any search text or
   * filter is active, resetting everything in one click.
   */
  onClearFilters?: () => void;

  /**
   * Optional slot rendered between search and sort — each picker mounts its
   * filter-panel trigger here (mobile drawer button on /choose-quiz, the
   * collapsible toggle in the multiplayer dialog).
   */
  filterAction?: React.ReactNode;

  /**
   * Render the search box (default true). The dashboard's play history turns it off — its
   * search sits in the filter sidebar, like the other dashboard pages' panels.
   */
  showSearch?: boolean;

  /**
   * Leave the sort menu out below `sm`. For a page that offers it somewhere else on a phone —
   * /choose-quiz puts it in the filter drawer, where it stops costing the toolbar a full row.
   */
  hideSortOnPhones?: boolean;
}

/**
 * The sort menu on its own, so it can sit in the toolbar and, on a phone, in the filter drawer
 * — one control, the same options and labels in both places.
 */
export function QuizSortSelect<S extends string = SortOption>({
  value,
  onValueChange,
  options = SORT_LABELS as Record<S, string>,
  className,
}: {
  value: S;
  onValueChange: (value: S) => void;
  options?: Record<S, string>;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as S)}>
      <SelectTrigger variant="minimal" aria-label="Sort quizzes" className={cn("h-9 w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent variant="minimal">
        {(Object.keys(options) as S[]).map((option) => (
          <SelectItem variant="minimal" key={option} value={option}>
            {options[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Shared search + sort toolbar for the quiz pickers and the play history. The faceted filters
 * (category/difficulty/language multi-select) live in QuizFilterPanel; this
 * toolbar hosts their trigger via `filterAction`.
 */
export function QuizToolbar<S extends string = SortOption>({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search quizzes...",
  sortBy,
  onSortChange,
  sortOptions = SORT_LABELS as Record<S, string>,
  resultCount,
  activeFilterCount = 0,
  showCount = true,
  onClearFilters,
  filterAction,
  showSearch = true,
  hideSortOnPhones = false,
}: QuizToolbarProps<S>) {
  return (
    <div>
      {/* Single toolbar row — search capped on desktop, sort pinned right.
          Wraps gracefully: mobile gets search full-width with actions beneath. */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Search — full width on mobile; on desktop it flex-grows to fill the
            available room (capped by max-w-md) instead of a hardcoded width, so
            the toolbar breathes on wide/ultra-wide screens and stacks cleanly on
            mobile. Minimal style: hairline border, soft shadow, primary on focus. */}
        {showSearch && (
        <div className="relative w-full lg:flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            role="searchbox"
            aria-label={searchPlaceholder.replace(/[.…]+$/, "")}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-9 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors duration-150 hover:border-foreground/25 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        )}

        {/* Per-picker filter trigger (mobile drawer / dialog collapsible) */}
        {filterAction}

        {/* Clear filters — only while something is actually filtering */}
        {onClearFilters && activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 h-9 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}

        {/* Sort + count — pinned to the right on desktop */}
        <div
          className={cn(
            "items-center gap-2 sm:gap-3 basis-full sm:basis-auto sm:ml-auto",
            hideSortOnPhones ? "hidden sm:flex" : "flex",
          )}
        >
          {sortBy !== undefined && onSortChange && (
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              <QuizSortSelect
                value={sortBy}
                onValueChange={onSortChange}
                options={sortOptions}
                className="sm:w-[165px]"
              />
            </div>
          )}

          {/* Result Count (optional — the page shows it in its results header instead) */}
          {showCount && (
            <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap tabular-nums">
              {resultCount.toLocaleString()}{" "}
              {resultCount === 1 ? "quiz" : "quizzes"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
