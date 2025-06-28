import { useState, useEffect, useCallback, useMemo } from "react";
import { Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  X,
  ChevronDown,
  Save,
  Bookmark,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Star,
} from "lucide-react";
import { SearchInput } from "@/lib/Search-Input";

// Mock types (replace with your actual types)
interface QuestionCategory {
  id: number;
  name: string;
}

interface QuestionDifficulty {
  id: number;
  level: string;
}

interface QuestionLanguage {
  id: number;
  language: string;
}

interface ActiveFilter {
  key: string;
  value: string | number | boolean;
  label: string;
  type: "select" | "boolean" | "search";
}

interface FilterPreset {
  id: string;
  label: string;
  filters: Record<string, string | number | boolean>;
  isDefault?: boolean;
  isFavorite?: boolean;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string | number | boolean>;
  createdAt: Date;
}

interface QuizFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  categories: QuestionCategory[];
  selectedCategoryId?: number;
  onCategoryChange: (categoryId?: number) => void;
  difficulties: QuestionDifficulty[];
  selectedDifficultyId?: number;
  onDifficultyChange: (difficultyId?: number) => void;
  languages: QuestionLanguage[];
  selectedLanguageId?: number;
  onLanguageChange: (languageId?: number) => void;
  selectedVisibility?: string;
  onVisibilityChange: (visibility?: string) => void;
  selectedIsPublished?: boolean;
  onIsPublishedChange: (isPublished?: boolean) => void;
  selectedIsActive?: boolean;
  onIsActiveChange: (isActive?: boolean) => void;
  totalResults?: number;
}

export const QuizFilters = ({
  searchTerm,
  onSearchTermChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
  difficulties,
  selectedDifficultyId,
  onDifficultyChange,
  languages,
  selectedLanguageId,
  onLanguageChange,
  selectedVisibility,
  onVisibilityChange,
  selectedIsPublished,
  onIsPublishedChange,
  selectedIsActive,
  onIsActiveChange,
  totalResults = 0,
}: QuizFiltersProps) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedFilterName, setSavedFilterName] = useState("");

  // Mock saved filters (in real app, this would come from API/localStorage)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([
    {
      id: "1",
      name: "My Active Quizzes",
      filters: { visibility: "Private", isActive: true },
      createdAt: new Date(),
    },
    {
      id: "2",
      name: "Public Published",
      filters: { visibility: "Public", isPublished: true },
      createdAt: new Date(),
    },
  ]);

  // Enhanced filter presets with better UX
  const presets: FilterPreset[] = [
    {
      id: "all",
      label: "All Quizzes",
      filters: {},
      isDefault: true,
    },
    {
      id: "my-quizzes",
      label: "My Quizzes",
      filters: { visibility: "Private" },
    },
    {
      id: "public",
      label: "Public",
      filters: { visibility: "Public", isPublished: true },
      isFavorite: true,
    },
    {
      id: "active",
      label: "Active Only",
      filters: { isActive: true },
    },
    {
      id: "drafts",
      label: "Drafts",
      filters: { isPublished: false },
    },
  ];

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      // In real app, trigger search here
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get active filters with enhanced metadata
  const getActiveFilters = useCallback((): ActiveFilter[] => {
    const filters: ActiveFilter[] = [];

    if (selectedCategoryId) {
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (category) {
        filters.push({
          key: "category",
          value: selectedCategoryId,
          label: category.name,
          type: "select",
        });
      }
    }

    if (selectedDifficultyId) {
      const difficulty = difficulties.find(
        (d) => d.id === selectedDifficultyId
      );
      if (difficulty) {
        filters.push({
          key: "difficulty",
          value: selectedDifficultyId,
          label: difficulty.level,
          type: "select",
        });
      }
    }

    if (selectedLanguageId) {
      const language = languages.find((l) => l.id === selectedLanguageId);
      if (language) {
        filters.push({
          key: "language",
          value: selectedLanguageId,
          label: language.language,
          type: "select",
        });
      }
    }

    if (selectedVisibility) {
      filters.push({
        key: "visibility",
        value: selectedVisibility,
        label: `Visibility: ${selectedVisibility}`,
        type: "select",
      });
    }

    if (selectedIsPublished !== undefined) {
      filters.push({
        key: "isPublished",
        value: selectedIsPublished,
        label: selectedIsPublished ? "Published" : "Unpublished",
        type: "boolean",
      });
    }

    if (selectedIsActive !== undefined) {
      filters.push({
        key: "isActive",
        value: selectedIsActive,
        label: selectedIsActive ? "Active" : "Inactive",
        type: "boolean",
      });
    }

    return filters;
  }, [
    selectedCategoryId,
    categories,
    selectedDifficultyId,
    difficulties,
    selectedLanguageId,
    languages,
    selectedVisibility,
    selectedIsPublished,
    selectedIsActive,
  ]);

  const activeFilters = getActiveFilters();
  const activeFilterCount = activeFilters.length;
  const hasSearchTerm = searchTerm.trim().length > 0;
  const totalActiveFilters = activeFilterCount + (hasSearchTerm ? 1 : 0);

  const removeFilter = (filterKey: string): void => {
    switch (filterKey) {
      case "category":
        onCategoryChange(undefined);
        break;
      case "difficulty":
        onDifficultyChange(undefined);
        break;
      case "language":
        onLanguageChange(undefined);
        break;
      case "visibility":
        onVisibilityChange(undefined);
        break;
      case "isPublished":
        onIsPublishedChange(undefined);
        break;
      case "isActive":
        onIsActiveChange(undefined);
        break;
      case "search":
        onSearchTermChange("");
        break;
    }
  };

  const applyPreset = (preset: FilterPreset): void => {
    clearAllFilters();
    Object.entries(preset.filters).forEach(([key, value]) => {
      switch (key) {
        case "visibility":
          onVisibilityChange(value as string);
          break;
        case "isPublished":
          onIsPublishedChange(value as boolean);
          break;
        case "isActive":
          onIsActiveChange(value as boolean);
          break;
        case "category":
          onCategoryChange(value as number);
          break;
        case "difficulty":
          onDifficultyChange(value as number);
          break;
        case "language":
          onLanguageChange(value as number);
          break;
      }
    });
  };

  const applySavedFilter = (savedFilter: SavedFilter): void => {
    clearAllFilters();
    Object.entries(savedFilter.filters).forEach(([key, value]) => {
      switch (key) {
        case "visibility":
          onVisibilityChange(value as string);
          break;
        case "isPublished":
          onIsPublishedChange(value as boolean);
          break;
        case "isActive":
          onIsActiveChange(value as boolean);
          break;
        case "category":
          onCategoryChange(value as number);
          break;
        case "difficulty":
          onDifficultyChange(value as number);
          break;
        case "language":
          onLanguageChange(value as number);
          break;
      }
    });
  };

  const clearAllFilters = (): void => {
    onSearchTermChange("");
    onCategoryChange(undefined);
    onDifficultyChange(undefined);
    onLanguageChange(undefined);
    onVisibilityChange(undefined);
    onIsPublishedChange(undefined);
    onIsActiveChange(undefined);
  };

  const saveCurrentFilters = (): void => {
    if (!savedFilterName.trim()) return;

    const currentFilters: Record<string, string | number | boolean> = {};

    if (selectedCategoryId) currentFilters.category = selectedCategoryId;
    if (selectedDifficultyId) currentFilters.difficulty = selectedDifficultyId;
    if (selectedLanguageId) currentFilters.language = selectedLanguageId;
    if (selectedVisibility) currentFilters.visibility = selectedVisibility;
    if (selectedIsPublished !== undefined)
      currentFilters.isPublished = selectedIsPublished;
    if (selectedIsActive !== undefined)
      currentFilters.isActive = selectedIsActive;

    const newSavedFilter: SavedFilter = {
      id: Date.now().toString(),
      name: savedFilterName,
      filters: currentFilters,
      createdAt: new Date(),
    };

    setSavedFilters((prev) => [...prev, newSavedFilter]);
    setSavedFilterName("");
    setShowSaveDialog(false);
  };

  const deleteSavedFilter = (filterId: string): void => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== filterId));
  };

  // Get current filter state summary
  const filterSummary = useMemo(() => {
    if (totalActiveFilters === 0) {
      return `Showing all ${totalResults.toLocaleString()} quizzes`;
    }
    return `${totalResults.toLocaleString()} results with ${totalActiveFilters} filter${
      totalActiveFilters !== 1 ? "s" : ""
    }`;
  }, [totalActiveFilters, totalResults]);

  return (
    <div className="space-y-6">
      {/* Header Section with Search and Quick Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-2xl">
          <SearchInput
            placeholder="Search quizzes by title..."
            onSearch={(searchTerm) => {
              onSearchTermChange(searchTerm);
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Save Filter Button */}
          {totalActiveFilters > 0 && (
            <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Save Current Filter</h4>
                  <div className="space-y-2">
                    <Input
                      placeholder="Filter name..."
                      value={savedFilterName}
                      onChange={(e) => setSavedFilterName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveCurrentFilters();
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSaveDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveCurrentFilters}
                        disabled={!savedFilterName.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Advanced Filters Toggle */}
          <Collapsible
            open={showAdvancedFilters}
            onOpenChange={setShowAdvancedFilters}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant={
                  showAdvancedFilters || totalActiveFilters > 0
                    ? "default"
                    : "outline"
                }
                className="gap-2 relative"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {totalActiveFilters > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary border-primary/20"
                  >
                    {totalActiveFilters}
                  </Badge>
                )}
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showAdvancedFilters ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Filter Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filterSummary}</span>
        {totalActiveFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-3 text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Quick Filter Presets - Enhanced Design */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive =
            JSON.stringify(preset.filters) ===
            JSON.stringify({
              ...(selectedCategoryId && { category: selectedCategoryId }),
              ...(selectedDifficultyId && { difficulty: selectedDifficultyId }),
              ...(selectedLanguageId && { language: selectedLanguageId }),
              ...(selectedVisibility && { visibility: selectedVisibility }),
              ...(selectedIsPublished !== undefined && {
                isPublished: selectedIsPublished,
              }),
              ...(selectedIsActive !== undefined && {
                isActive: selectedIsActive,
              }),
            });

          return (
            <Button
              key={preset.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(preset)}
              className={`h-9 px-4 gap-2 transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-muted/80 hover:scale-105"
              }`}
            >
              {preset.isFavorite && <Star className="w-3 h-3" />}
              {preset.label}
              {isActive && <Check className="w-3 h-3" />}
            </Button>
          );
        })}
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            Saved Filters
          </h4>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center gap-1 bg-muted/50 rounded-lg pl-3 pr-1 py-1"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applySavedFilter(filter)}
                  className="h-auto p-1 font-normal text-sm hover:bg-transparent"
                >
                  {filter.name}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSavedFilter(filter.id)}
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Pills - Enhanced */}
      {(activeFilters.length > 0 || hasSearchTerm) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Active Filters
          </h4>
          <div className="flex flex-wrap gap-2">
            {hasSearchTerm && (
              <Badge
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <Search className="w-3 h-3" />
                <span>"{searchTerm}"</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter("search")}
                  className="h-auto p-0 hover:bg-transparent hover:text-destructive ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary transition-colors"
              >
                <span className="font-medium">{filter.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(filter.key)}
                  className="h-auto p-0 hover:bg-transparent hover:text-destructive ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters Panel - Redesigned */}
      <Collapsible
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
      >
        <CollapsibleContent className="space-y-6">
          <div className="bg-gradient-to-br from-card via-card/95 to-muted/30 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Category Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Category
                </Label>
                <Select
                  value={
                    selectedCategoryId ? selectedCategoryId.toString() : ""
                  }
                  onValueChange={(value) =>
                    onCategoryChange(value ? Number(value) : undefined)
                  }
                >
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Filter */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  Difficulty
                </label>
                <Select
                  value={
                    selectedDifficultyId ? selectedDifficultyId.toString() : ""
                  }
                  onValueChange={(value) =>
                    onDifficultyChange(value ? Number(value) : undefined)
                  }
                >
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Any difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((difficulty) => (
                      <SelectItem
                        key={difficulty.id}
                        value={difficulty.id.toString()}
                      >
                        {difficulty.level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language Filter */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Language
                </label>
                <Select
                  value={
                    selectedLanguageId ? selectedLanguageId.toString() : ""
                  }
                  onValueChange={(value) =>
                    onLanguageChange(value ? Number(value) : undefined)
                  }
                >
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Any language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem
                        key={language.id}
                        value={language.id.toString()}
                      >
                        {language.language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility Filter */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  Visibility
                </label>
                <Select
                  value={selectedVisibility || ""}
                  onValueChange={(value) =>
                    onVisibilityChange(value || undefined)
                  }
                >
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Any visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Public">🌍 Public</SelectItem>
                    <SelectItem value="Private">🔒 Private</SelectItem>
                    <SelectItem value="Friends">👥 Friends Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Publication Status
                </label>
                <Select
                  value={
                    selectedIsPublished === undefined
                      ? ""
                      : selectedIsPublished
                      ? "published"
                      : "unpublished"
                  }
                  onValueChange={(value) =>
                    onIsPublishedChange(
                      value === "" ? undefined : value === "published"
                    )
                  }
                >
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Any status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">✅ Published</SelectItem>
                    <SelectItem value="unpublished">📝 Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Status Filter */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  Active Status
                </label>
                <Select
                  value={
                    selectedIsActive === undefined
                      ? ""
                      : selectedIsActive
                      ? "active"
                      : "inactive"
                  }
                  onValueChange={(value) =>
                    onIsActiveChange(
                      value === "" ? undefined : value === "active"
                    )
                  }
                >
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Any status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">🟢 Active</SelectItem>
                    <SelectItem value="inactive">⚪ Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
