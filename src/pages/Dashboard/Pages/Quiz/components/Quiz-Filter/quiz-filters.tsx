/** The main container component that manages state and logic for quiz filtering. */

import { useState, useCallback, useMemo } from "react";
import { SearchInput } from "@/lib/Search-Input";
import {
  ActiveFilter,
  QuizFiltersProps,
  FilterPreset,
  CurrentFilters,
} from "./types";
import { FilterActions } from "./filter-actions";
import { FilterSummary } from "./filter-summary";
import { FilterPresets } from "./filter-presets";
// import { SavedFiltersList } from "./saved-filter-list";
import { ActiveFilterPills } from "./active-filter-pills";
import { FilterPanel } from "./filter-panel";
import { Label } from "@/components/ui/form/label";

export const QuizFilters = ({
  filterState,
  dispatch,
  categories,
  difficulties,
  languages,
  totalResults = 0,
}: QuizFiltersProps) => {
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  //   const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([
  //     {
  //       id: "1",
  //       name: "My Active Quizzes",
  //       filters: { visibility: "Private", isActive: true },
  //       createdAt: new Date(),
  //     },
  //     {
  //       id: "2",
  //       name: "Public Published",
  //       filters: { visibility: "Public", isPublished: true },
  //       createdAt: new Date(),
  //     },
  //   ]);

  const {
    searchTerm,
    selectedCategoryId,
    selectedDifficultyId,
    selectedLanguageId,
    selectedVisibility,
    selectedIsPublished,
    selectedIsActive,
  } = filterState;

  const presets: FilterPreset[] = [
    {
      id: "my-quizzes",
      label: "My Quizzes",
      filters: { visibility: "Private" }, //NEED TO FIX THIS BECAUSE PRIVATE DOES NOT MEAN MY QUIZ IT MEANS ANY QUIZ THAT IS NOT PUBLIC
    },
    { id: "all", label: "All Quizzes", filters: {}, isDefault: true },
    {
      id: "my-quizzes",
      label: "My Quizzes",
      filters: { visibility: "Private" }, //NEED TO FIX THIS BECAUSE PRIVATE DOES NOT MEAN MY QUIZ IT MEANS ANY QUIZ THAT IS NOT PUBLIC
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
    dispatch({ type: "CLEAR_ALL" });
  }, [dispatch]);

  const applyFiltersFromObject = useCallback(
    (filters: Record<string, any>) => {
      clearAllFilters(); // This already dispatches CLEAR_ALL
      Object.entries(filters).forEach(([key, value]) => {
        switch (key) {
          case "visibility":
            dispatch({ type: "SET_VISIBILITY", payload: value as string });
            break;
          case "isPublished":
            dispatch({ type: "SET_IS_PUBLISHED", payload: value as boolean });
            break;
          // ... and so on for other cases
          case "category":
            dispatch({ type: "SET_CATEGORY", payload: value as number });
            break;
        }
      });
    },
    [dispatch, clearAllFilters]
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
      search: () => dispatch({ type: "SET_SEARCH_TERM", payload: "" }),
      category: () => dispatch({ type: "SET_CATEGORY", payload: undefined }),
      difficulty: () =>
        dispatch({ type: "SET_DIFFICULTY", payload: undefined }),
      language: () => dispatch({ type: "SET_LANGUAGE", payload: undefined }),
      visibility: () =>
        dispatch({ type: "SET_VISIBILITY", payload: undefined }),
      isPublished: () =>
        dispatch({ type: "SET_IS_PUBLISHED", payload: undefined }),
      isActive: () => dispatch({ type: "SET_IS_ACTIVE", payload: undefined }),
    };
    keyMap[filterKey]?.();
  };

  //   const saveCurrentFilters = (name: string) => {
  //     const filtersToSave = Object.entries(currentFilters).reduce(
  //       (acc, [key, value]) => {
  //         if (value !== undefined) {
  //           acc[key] = value;
  //         }
  //         return acc;
  //       },
  //       {} as Record<string, string | number | boolean>
  //     );

  //     const newSavedFilter: SavedFilter = {
  //       id: Date.now().toString(),
  //       name,
  //       filters: filtersToSave, // Use the new, clean object
  //       createdAt: new Date(),
  //     };
  //     setSavedFilters((prev) => [...prev, newSavedFilter]);
  //   };

  //   const deleteSavedFilter = (filterId: string) => {
  //     setSavedFilters((prev) => prev.filter((f) => f.id !== filterId));
  //   };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-2xl">
          <SearchInput
            placeholder="Search quizzes by title..."
            onSearch={(value) =>
              dispatch({ type: "SET_SEARCH_TERM", payload: value })
            }
          />
        </div>
        <FilterActions
          totalActiveFilters={totalActiveFilters}
          showFiltersPopover={showFiltersPopover}
          onToggleFilters={() => setShowFiltersPopover((s) => !s)}
          //   onSave={saveCurrentFilters}
        >
          <FilterPanel
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={(id) =>
              dispatch({ type: "SET_CATEGORY", payload: id })
            }
            difficulties={difficulties}
            selectedDifficultyId={selectedDifficultyId}
            onDifficultyChange={(id) =>
              dispatch({ type: "SET_DIFFICULTY", payload: id })
            }
            languages={languages}
            selectedLanguageId={selectedLanguageId}
            onLanguageChange={(id) =>
              dispatch({ type: "SET_LANGUAGE", payload: id })
            }
            // selectedVisibility={selectedVisibility}
            // onVisibilityChange={onVisibilityChange}
            // selectedIsPublished={selectedIsPublished}
            // onIsPublishedChange={onIsPublishedChange}
            // selectedIsActive={selectedIsActive}
            // onIsActiveChange={onIsActiveChange}
          />
        </FilterActions>
      </div>

      <FilterSummary
        totalResults={totalResults}
        totalActiveFilters={totalActiveFilters}
        onClearAll={clearAllFilters}
      />

      <section className="space-y-2">
        <Label>Existing Filters</Label>
        <FilterPresets
          presets={presets}
          currentFilters={currentFilters}
          onApplyPreset={(p) => applyFiltersFromObject(p.filters)}
        />
      </section>

      {/* <SavedFiltersList
        savedFilters={savedFilters}
        onApply={(f) => applyFiltersFromObject(f.filters)}
        onDelete={deleteSavedFilter}
      /> */}
      {/* ADD THIS BACK WHEN WE FIX THE SAVING OF THE USERS FILTERS DYNAMICALLY */}

      <ActiveFilterPills
        searchTerm={searchTerm}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
      />
    </div>
  );
};
