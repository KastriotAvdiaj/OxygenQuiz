import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
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
 * Sort options exposed to users. Only fields the backend whitelists as sortable
 * (see QuizFilterFields.cs: `createdAt` and `title`) can be used, so each option
 * maps to one of those via SORT_RULES below.
 */
export type SortOption = "newest" | "oldest" | "title-asc" | "title-desc";

export const SORT_RULES: Record<SortOption, SortRule> = {
  newest: { field: "createdAt", direction: "desc" },
  oldest: { field: "createdAt", direction: "asc" },
  "title-asc": { field: "title", direction: "asc" },
  "title-desc": { field: "title", direction: "desc" },
};

const SORT_LABELS: Record<SortOption, string> = {
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
}

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
}: QuizToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Search Row */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search quizzes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg border-2 border-primary/20 bg-background text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />

        {/* Category Filter */}
        <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-8 w-[140px] sm:w-[160px] text-xs sm:text-sm border-primary/20 focus:ring-primary/20">
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

        {/* Difficulty Filter */}
        <Select value={selectedDifficultyId} onValueChange={onDifficultyChange}>
          <SelectTrigger className="h-8 w-[130px] sm:w-[150px] text-xs sm:text-sm border-primary/20 focus:ring-primary/20">
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

        {/* Language Filter */}
        <Select value={selectedLanguageId} onValueChange={onLanguageChange}>
          <SelectTrigger className="h-8 w-[130px] sm:w-[150px] text-xs sm:text-sm border-primary/20 focus:ring-primary/20">
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

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          <Select
            value={sortBy}
            onValueChange={(v) => onSortChange(v as SortOption)}
          >
            <SelectTrigger className="h-8 w-[130px] sm:w-[150px] text-xs sm:text-sm border-primary/20 focus:ring-primary/20">
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

        {/* Result Count */}
        <div className="ml-auto">
          <Badge
            variant="secondary"
            className="text-xs font-medium px-2.5 py-1"
          >
            {resultCount} {resultCount === 1 ? "quiz" : "quizzes"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
