import { Search, ArrowUpDown, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import type { SortRule } from "@/lib/filtering";

/**
 * Sentinel value used by the filter dropdowns to represent "no filter applied" (the default).
 * The Select component requires a non-empty string value, so we can't use "".
 */
export const ALL_FILTER = "all";

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

  categories: QuestionCategory[];
  selectedCategoryId: string;
  onCategoryChange: (value: string) => void;

  difficulties: QuestionDifficulty[];
  selectedDifficultyId: string;
  onDifficultyChange: (value: string) => void;

  languages: QuestionLanguage[];
  selectedLanguageId: string;
  onLanguageChange: (value: string) => void;

  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;

  resultCount: number;

  /**
   * Whether to render the result count inside the toolbar (default true).
   * The quiz-selection page renders the count in its own results header instead.
   */
  showCount?: boolean;

  /**
   * Optional: when provided, a "Clear" action appears in the filters row while any
   * search text or filter is active, resetting everything in one click.
   */
  onClearFilters?: () => void;
}

/**
 * Shared trigger styling layered on top of the `quiz` Select variant;
 * active (non-default) filters get a stronger border + primary text.
 */
const triggerClass = (isActive: boolean) =>
  `w-full sm:w-[160px] ${
    isActive
      ? "border-primary/80 dark:border-primary text-primary font-semibold"
      : ""
  }`;

export function QuizToolbar({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
  difficulties,
  selectedDifficultyId,
  onDifficultyChange,
  languages,
  selectedLanguageId,
  onLanguageChange,
  sortBy,
  onSortChange,
  resultCount,
  showCount = true,
  onClearFilters,
}: QuizToolbarProps) {
  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (selectedCategoryId !== ALL_FILTER ? 1 : 0) +
    (selectedDifficultyId !== ALL_FILTER ? 1 : 0) +
    (selectedLanguageId !== ALL_FILTER ? 1 : 0);

  return (
    <div>
      {/* Single toolbar row — search capped on desktop, filters inline, sort pinned right.
          Wraps gracefully: mobile gets search full-width with filters 2-up beneath. */}
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
            className="w-full h-9 md:h-8 lg:h-9 pl-9 pr-9 rounded-xl border-2 border-primary/40 dark:border-primary/60 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 text-sm md:text-xs lg:text-sm font-medium font-header placeholder:text-muted-foreground shadow-[0_3px_0_0_hsl(var(--primary)/0.35)] md:shadow-[0_2px_0_0_hsl(var(--primary)/0.35)] lg:shadow-[0_3px_0_0_hsl(var(--primary)/0.35)] focus:border-primary/70 focus:shadow-[0_2px_0_0_hsl(var(--primary)/0.45)] focus:translate-y-px focus:outline-none transition-all duration-200"
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
        {/* Category Filter */}
        <div className="basis-[calc(50%-0.25rem)] sm:basis-auto">
          <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
            <SelectTrigger
              variant="quiz"
              aria-label="Filter by category"
              className={triggerClass(selectedCategoryId !== ALL_FILTER)}
            >
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent variant="quiz">
              <SelectItem variant="quiz" value={ALL_FILTER}>
                All Categories
              </SelectItem>
              {categories.map((cat) => (
                <SelectItem variant="quiz" key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty Filter */}
        <div className="basis-[calc(50%-0.25rem)] sm:basis-auto">
          <Select value={selectedDifficultyId} onValueChange={onDifficultyChange}>
            <SelectTrigger
              variant="quiz"
              aria-label="Filter by difficulty"
              className={triggerClass(selectedDifficultyId !== ALL_FILTER)}
            >
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent variant="quiz">
              <SelectItem variant="quiz" value={ALL_FILTER}>
                All Difficulties
              </SelectItem>
              {difficulties.map((diff) => (
                <SelectItem variant="quiz" key={diff.id} value={String(diff.id)}>
                  {diff.level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Filter */}
        <div className="basis-[calc(50%-0.25rem)] sm:basis-auto">
          <Select value={selectedLanguageId} onValueChange={onLanguageChange}>
            <SelectTrigger
              variant="quiz"
              aria-label="Filter by language"
              className={triggerClass(selectedLanguageId !== ALL_FILTER)}
            >
              <SelectValue placeholder="All Languages" />
            </SelectTrigger>
            <SelectContent variant="quiz">
              <SelectItem variant="quiz" value={ALL_FILTER}>
                All Languages
              </SelectItem>
              {languages.map((lang) => (
                <SelectItem variant="quiz" key={lang.id} value={String(lang.id)}>
                  {lang.language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
