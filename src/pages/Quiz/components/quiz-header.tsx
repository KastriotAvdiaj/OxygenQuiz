import { Search, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
 * app's breadth — the default for both quiz pickers (see docs/quiz-discovery.md).
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
   * Optional: when provided, a "Clear" action appears in the filters row while any
   * search text or filter is active, resetting everything in one click.
   */
  onClearFilters?: () => void;
}

/** Shared trigger styling; active (non-default) filters get a stronger border + text. */
const triggerClass = (isActive: boolean) =>
  `h-9 w-full sm:w-[150px] text-xs sm:text-sm transition-colors ${
    isActive
      ? "border-primary/60 text-primary font-semibold"
      : "border-primary/20 text-foreground"
  } focus:ring-primary/20`;

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
  onClearFilters,
}: QuizToolbarProps) {
  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (selectedCategoryId !== ALL_FILTER ? 1 : 0) +
    (selectedDifficultyId !== ALL_FILTER ? 1 : 0) +
    (selectedLanguageId !== ALL_FILTER ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search Row — controlled, live (parents debounce), works on every breakpoint */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          role="searchbox"
          aria-label="Search quizzes"
          placeholder="Search quizzes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-10 rounded-lg border-2 border-primary/20 bg-background text-sm font-medium placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters Row — 2-up on mobile, inline on larger screens */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />

        {/* Category Filter */}
        <div className="basis-[calc(50%-0.25rem)] sm:basis-auto">
          <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
            <SelectTrigger
              aria-label="Filter by category"
              className={triggerClass(selectedCategoryId !== ALL_FILTER)}
            >
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
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
              aria-label="Filter by difficulty"
              className={triggerClass(selectedDifficultyId !== ALL_FILTER)}
            >
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All Difficulties</SelectItem>
              {difficulties.map((diff) => (
                <SelectItem key={diff.id} value={String(diff.id)}>
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
              aria-label="Filter by language"
              className={triggerClass(selectedLanguageId !== ALL_FILTER)}
            >
              <SelectValue placeholder="All Languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All Languages</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang.id} value={String(lang.id)}>
                  {lang.language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 basis-[calc(50%-0.25rem)] sm:basis-auto">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          <Select
            value={sortBy}
            onValueChange={(v) => onSortChange(v as SortOption)}
          >
            <SelectTrigger
              aria-label="Sort quizzes"
              className="h-9 w-full sm:w-[150px] text-xs sm:text-sm border-primary/20 focus:ring-primary/20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_RULES) as SortOption[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {SORT_LABELS[option]}
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
            className="inline-flex items-center gap-1 h-9 px-2.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
            <span className="text-[10px] font-bold rounded-full bg-muted px-1.5 py-0.5">
              {activeFilterCount}
            </span>
          </button>
        )}

        {/* Result Count */}
        <div className="ml-auto">
          <Badge variant="secondary" className="text-xs font-medium px-2.5 py-1">
            {resultCount} {resultCount === 1 ? "quiz" : "quizzes"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
