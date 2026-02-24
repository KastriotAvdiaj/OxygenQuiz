import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = "newest" | "alphabetical" | "most-questions";

interface QuizToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  categories: string[];
  resultCount: number;
}

export function QuizToolbar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  categories,
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
        {/* Category Filter */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-8 w-[140px] sm:w-[160px] text-xs sm:text-sm border-primary/20 focus:ring-primary/20">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="alphabetical">A → Z</SelectItem>
              <SelectItem value="most-questions">Most Questions</SelectItem>
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
