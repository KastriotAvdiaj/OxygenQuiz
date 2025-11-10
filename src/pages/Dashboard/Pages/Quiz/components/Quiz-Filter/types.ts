/** Defines shared TypeScript interfaces and types for the quiz filtering system. */

import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import { FilterAction, FilterState } from "./filter-config";

export interface ActiveFilter {
  key: string;
  value: string | number | boolean;
  label: string;
  type: "select" | "boolean" | "search";
}

export interface FilterPreset {
  id: string;
  label: string;
  filters: Record<string, string | number | boolean>;
  isDefault?: boolean;
  isFavorite?: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string | number | boolean>;
  createdAt: Date;
}

export interface CurrentFilters {
  category?: number;
  difficulty?: number;
  language?: number;
  visibility?: string;
  isPublished?: boolean;
  isActive?: boolean;
}

export interface QuizFiltersProps {
  // searchTerm: string;
  // onSearchTermChange: (term: string) => void;
  // selectedCategoryId?: number;
  // onCategoryChange: (categoryId?: number) => void;
  // selectedDifficultyId?: number;
  // onDifficultyChange: (difficultyId?: number) => void;
  // selectedLanguageId?: number;
  // onLanguageChange: (languageId?: number) => void;
  // selectedVisibility?: string;
  // onVisibilityChange: (visibility?: string) => void;
  // selectedIsPublished?: boolean;
  // onIsPublishedChange: (isPublished?: boolean) => void;
  // selectedIsActive?: boolean;
  // onIsActiveChange: (isActive?: boolean) => void;
  filterState: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  categories: QuestionCategory[];
  totalResults?: number;
}
