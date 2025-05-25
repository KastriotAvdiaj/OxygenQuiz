import { Input } from "@/components/ui/form";

import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";

interface QuestionFiltersProps {
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
}

export const QuestionFilters = ({
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
}: QuestionFiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border dark:border-foreground/30 rounded-md bg-card">
      <Input
        placeholder="Search questions..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="lg:col-span-1"
      />
      <CategorySelect
        mode="filter"
        categories={categories}
        value={selectedCategoryId}
        onChange={onCategoryChange}
      />

      <DifficultySelect
        mode="filter"
        difficulties={difficulties}
        value={selectedDifficultyId}
        onChange={onDifficultyChange}
      />
      <LanguageSelect
        mode="filter"
        languages={languages}
        value={selectedLanguageId}
        onChange={onLanguageChange}
      />
    </div>
  );
};
