import { useState } from "react";
import { Input } from "@/components/ui/form";
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
import { Search, Filter, X, ChevronDown } from "lucide-react";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";

interface ActiveFilter {
  key: string;
  value: string | number | boolean;
  label: string;
}

interface FilterPreset {
  label: string;
  filters: Record<string, string | number | boolean>;
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

  // Quiz-specific filters
  selectedVisibility?: string;
  onVisibilityChange: (visibility?: string) => void;

  selectedIsPublished?: boolean;
  onIsPublishedChange: (isPublished?: boolean) => void;

  selectedIsActive?: boolean;
  onIsActiveChange: (isActive?: boolean) => void;
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
}: QuizFiltersProps) => {
  const [showAdvancedFilters, setShowAdvancedFilters] =
    useState<boolean>(false);

  // Filter presets
  const presets: FilterPreset[] = [
    {
      label: "My Quizzes",
      filters: { visibility: "Private" },
    },
    {
      label: "Public",
      filters: { visibility: "Public", isPublished: true },
    },
    {
      label: "Active",
      filters: { isActive: true },
    },
  ];

  // Get active filters for display
  const getActiveFilters = (): ActiveFilter[] => {
    const filters: ActiveFilter[] = [];

    if (selectedCategoryId) {
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (category) {
        filters.push({
          key: "category",
          value: selectedCategoryId,
          label: category.name,
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
        });
      }
    }

    if (selectedVisibility) {
      filters.push({
        key: "visibility",
        value: selectedVisibility,
        label: selectedVisibility,
      });
    }

    if (selectedIsPublished !== undefined) {
      filters.push({
        key: "isPublished",
        value: selectedIsPublished,
        label: selectedIsPublished ? "Published" : "Unpublished",
      });
    }

    if (selectedIsActive !== undefined) {
      filters.push({
        key: "isActive",
        value: selectedIsActive,
        label: selectedIsActive ? "Active" : "Inactive",
      });
    }

    return filters;
  };

  const activeFilters = getActiveFilters();
  const activeFilterCount = activeFilters.length;

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
    }
  };

  const applyPreset = (preset: FilterPreset): void => {
    // Clear all filters first
    clearAllFilters();

    // Apply preset filters
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

  return (
    <div className="space-y-4 p-4 border dark:border-foreground/30 rounded-md bg-card">
      {/* Main Search + Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e: any) => onSearchTermChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Toggle Button */}
        <Collapsible
          open={showAdvancedFilters}
          onOpenChange={setShowAdvancedFilters}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant={
                showAdvancedFilters || activeFilterCount > 0
                  ? "default"
                  : "outline"
              }
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showAdvancedFilters ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Filter Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset)}
            className="h-8"
          >
            {preset.label}
          </Button>
        ))}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-destructive hover:text-destructive"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1"
            >
              <span>{filter.label}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(filter.key)}
                className="h-auto p-0 hover:bg-transparent"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced Filters Panel */}
      <Collapsible
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
      >
        <CollapsibleContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border border-border rounded-md bg-muted/30">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Category
              </label>
              <Select
                value={selectedCategoryId ? selectedCategoryId.toString() : ""}
                onValueChange={(value) =>
                  onCategoryChange(value ? Number(value) : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty..." />
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Language
              </label>
              <Select
                value={selectedLanguageId ? selectedLanguageId.toString() : ""}
                onValueChange={(value) =>
                  onLanguageChange(value ? Number(value) : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language..." />
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Visibility
              </label>
              <Select
                value={selectedVisibility || ""}
                onValueChange={(value) =>
                  onVisibilityChange(value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Friends">Friends</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Status
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
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select active status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
