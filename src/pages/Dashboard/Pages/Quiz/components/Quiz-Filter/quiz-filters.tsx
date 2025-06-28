/** The main container component that manages state and logic for quiz filtering. */

import { useState, useCallback, useMemo } from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SearchInput } from "@/lib/Search-Input";
import {
  ActiveFilter,
  QuizFiltersProps,
  FilterPreset,
  SavedFilter,
  CurrentFilters,
} from "./types";
import { FilterActions } from "./filter-actions";
import { FilterSummary } from "./filter-summary";
import { FilterPresets } from "./filter-presets";
import { SavedFiltersList } from "./saved-filter-list";
import { ActiveFilterPills } from "./active-filter-pills";
import { FilterPanel } from "./filter-panel";

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

  const presets: FilterPreset[] = [
    { id: "all", label: "All Quizzes", filters: {}, isDefault: true },
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
    { id: "active", label: "Active Only", filters: { isActive: true } },
    { id: "drafts", label: "Drafts", filters: { isPublished: false } },
  ];

  const clearAllFilters = useCallback(() => {
    onSearchTermChange("");
    onCategoryChange(undefined);
    onDifficultyChange(undefined);
    onLanguageChange(undefined);
    onVisibilityChange(undefined);
    onIsPublishedChange(undefined);
    onIsActiveChange(undefined);
  }, [
    onSearchTermChange,
    onCategoryChange,
    onDifficultyChange,
    onLanguageChange,
    onVisibilityChange,
    onIsPublishedChange,
    onIsActiveChange,
  ]);

  const applyFiltersFromObject = useCallback(
    (filters: Record<string, any>) => {
      clearAllFilters();
      Object.entries(filters).forEach(([key, value]) => {
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
    },
    [
      clearAllFilters,
      onVisibilityChange,
      onIsPublishedChange,
      onIsActiveChange,
      onCategoryChange,
      onDifficultyChange,
      onLanguageChange,
    ]
  );

  const activeFilters = useMemo((): ActiveFilter[] => {
    const filters: ActiveFilter[] = [];
    if (selectedCategoryId) {
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (category)
        filters.push({
          key: "category",
          value: selectedCategoryId,
          label: category.name,
          type: "select",
        });
    }
    if (selectedDifficultyId) {
      const difficulty = difficulties.find(
        (d) => d.id === selectedDifficultyId
      );
      if (difficulty)
        filters.push({
          key: "difficulty",
          value: selectedDifficultyId,
          label: difficulty.level,
          type: "select",
        });
    }
    if (selectedLanguageId) {
      const language = languages.find((l) => l.id === selectedLanguageId);
      if (language)
        filters.push({
          key: "language",
          value: selectedLanguageId,
          label: language.language,
          type: "select",
        });
    }
    if (selectedVisibility)
      filters.push({
        key: "visibility",
        value: selectedVisibility,
        label: `Visibility: ${selectedVisibility}`,
        type: "select",
      });
    if (selectedIsPublished !== undefined)
      filters.push({
        key: "isPublished",
        value: selectedIsPublished,
        label: selectedIsPublished ? "Published" : "Unpublished",
        type: "boolean",
      });
    if (selectedIsActive !== undefined)
      filters.push({
        key: "isActive",
        value: selectedIsActive,
        label: selectedIsActive ? "Active" : "Inactive",
        type: "boolean",
      });
    return filters;
  }, [
    categories,
    difficulties,
    languages,
    selectedCategoryId,
    selectedDifficultyId,
    selectedLanguageId,
    selectedVisibility,
    selectedIsPublished,
    selectedIsActive,
  ]);

  const hasSearchTerm = searchTerm.trim().length > 0;
  const totalActiveFilters = activeFilters.length + (hasSearchTerm ? 1 : 0);

  const currentFilters: CurrentFilters = useMemo(
    () => ({
      category: selectedCategoryId,
      difficulty: selectedDifficultyId,
      language: selectedLanguageId,
      visibility: selectedVisibility,
      isPublished: selectedIsPublished,
      isActive: selectedIsActive,
    }),
    [
      selectedCategoryId,
      selectedDifficultyId,
      selectedLanguageId,
      selectedVisibility,
      selectedIsPublished,
      selectedIsActive,
    ]
  );

  const removeFilter = (filterKey: string) => {
    const keyMap: Record<string, () => void> = {
      search: () => onSearchTermChange(""),
      category: () => onCategoryChange(undefined),
      difficulty: () => onDifficultyChange(undefined),
      language: () => onLanguageChange(undefined),
      visibility: () => onVisibilityChange(undefined),
      isPublished: () => onIsPublishedChange(undefined),
      isActive: () => onIsActiveChange(undefined),
    };
    keyMap[filterKey]?.();
  };

  const saveCurrentFilters = (name: string) => {
    // Create a new object, filtering out any keys with an undefined value.
    const filtersToSave = Object.entries(currentFilters).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string | number | boolean>
    );

    const newSavedFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters: filtersToSave, // Use the new, clean object
      createdAt: new Date(),
    };
    setSavedFilters((prev) => [...prev, newSavedFilter]);
  };

  const deleteSavedFilter = (filterId: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== filterId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-2xl">
          <SearchInput
            placeholder="Search quizzes by title..."
            onSearch={onSearchTermChange}
          />
        </div>
        <FilterActions
          totalActiveFilters={totalActiveFilters}
          showAdvancedFilters={showAdvancedFilters}
          onToggleAdvanced={() => setShowAdvancedFilters((s) => !s)}
          onSave={saveCurrentFilters}
        />
      </div>

      <FilterSummary
        totalResults={totalResults}
        totalActiveFilters={totalActiveFilters}
        onClearAll={clearAllFilters}
      />

      <FilterPresets
        presets={presets}
        currentFilters={currentFilters}
        onApplyPreset={(p) => applyFiltersFromObject(p.filters)}
      />

      <SavedFiltersList
        savedFilters={savedFilters}
        onApply={(f) => applyFiltersFromObject(f.filters)}
        onDelete={deleteSavedFilter}
      />

      <ActiveFilterPills
        searchTerm={searchTerm}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
      />

      <Collapsible
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
      >
        <CollapsibleContent>
          <FilterPanel
            {...{
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
            }}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
