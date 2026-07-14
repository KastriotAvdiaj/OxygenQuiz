import { Search, ArrowUpDown, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortRule } from "@/lib/filtering";

/**
 * Sort options exposed to users. `variety` is a backend pseudo-sort that interleaves
 * categories (newest of each category first) so the catalogue's first page shows the
 * app's breadth — the default for both quiz pickers (see docs/quiz/quiz-discovery.md).
 * The rest map to fields the backend whitelists as sortable (QuizFilterFields.cs:
 * `createdAt` and `title`).
 */
export type SortOption =
  | "variety"
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc";

/** The default sort for quiz pickers — mixed categories, newest of each first. */
export const DEFAULT_SORT: SortOption = "variety";

export const SORT_RULES: Record<SortOption, SortRule> = {
  variety: { field: "variety", direction: "desc" },
  newest: { field: "createdAt", direction: "desc" },
  oldest: { field: "createdAt", direction: "asc" },
  "title-asc": { field: "title", direction: "asc" },
  "title-desc": { field: "title", direction: "desc" },
};

const SORT_LABELS: Record<SortOption, string> = {
  variety: "Mixed Categories",
  newest: "Newest First",
  oldest: "Oldest First",
  "title-asc": "A → Z",
  "title-desc": "Z → A",
};

interface QuizToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;

  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;

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
}

/**
 * Shared search + sort toolbar for the quiz pickers. The faceted filters
 * (category/difficulty/language multi-select) live in QuizFilterPanel; this
 * toolbar hosts their trigger via `filterAction`.
 */
export function QuizToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  resultCount,
  activeFilterCount = 0,
  showCount = true,
  onClearFilters,
  filterAction,
}: QuizToolbarProps) {
  return (
    <div>
      {/* Single toolbar row — search capped on desktop, sort pinned right.
          Wraps gracefully: mobile gets search full-width with actions beneath. */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Search — full width on mobile, capped on desktop so it doesn't dominate */}
        <div className="relative w-full lg:w-72 xl:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70 pointer-events-none" />
          <input
            type="text"
            role="searchbox"
            aria-label="Search quizzes"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            // Same design language as LiftedButton: solid theme surface (readable
            // in both themes), full-strength primary border, and a solid
            // darkened-primary "edge". Press-in happens only on mousedown
            // (:active) — while focused the field sits back up for typing.
            className="w-full h-9 md:h-8 lg:h-9 pl-9 pr-9 rounded-xl border-2 border-primary/60 dark:border-primary/70 bg-background text-sm md:text-xs lg:text-sm font-medium font-header text-foreground placeholder:text-muted-foreground shadow-[0_3px_0_0_var(--primary-edge)] md:shadow-[0_2px_0_0_var(--primary-edge)] lg:shadow-[0_3px_0_0_var(--primary-edge)] hover:border-primary/80 hover:bg-primary/5 dark:hover:bg-primary/10 focus:border-primary focus:bg-primary/5 dark:focus:bg-primary/10 active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--primary-edge)] focus:outline-none transition-all duration-200"
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
        <div className="flex items-center gap-2 sm:gap-3 basis-full sm:basis-auto sm:ml-auto">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <ArrowUpDown className="h-3.5 w-3.5 text-primary/60 hidden sm:block" />
            <Select
              value={sortBy}
              onValueChange={(v) => onSortChange(v as SortOption)}
            >
              <SelectTrigger
                variant="quiz"
                aria-label="Sort quizzes"
                className="w-full sm:w-[175px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent variant="quiz">
                {(Object.keys(SORT_RULES) as SortOption[]).map((option) => (
                  <SelectItem variant="quiz" key={option} value={option}>
                    {SORT_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
