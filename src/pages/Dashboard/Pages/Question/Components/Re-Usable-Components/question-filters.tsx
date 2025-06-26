import { Input } from "@/components/ui/form"; // Assuming this is shadcn/ui Input
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import { Button } from "@/components/ui"; // Assuming this is shadcn/ui Button
import { ChevronDown, ChevronUp, Filter, Search, X } from "lucide-react";
import { RiFilterOffLine } from "react-icons/ri";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";

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
  const { isOpen, toggle } = useDisclosure(false);

  const resetFilters = () => {
    onSearchTermChange("");
    onCategoryChange(undefined);
    onDifficultyChange(undefined);
    onLanguageChange(undefined);
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 rounded-md w-fit">
        <div className="flex flex-1 relative w-full items-center mb-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full shadow-none pl-10 py-4 pr-3 h-9 dark:border-foreground/20 bg-muted/70 min-w-[200px] sm:min-w-[300px] rounded-md focus:ring-0 focus:border-primary"
          />
        </div>

        <Button
          variant="outline"
          onClick={toggle}
          className={`flex items-center gap-2 w-full rounded-md sm:w-auto text-sm px-3 shrink-0 h-9 ${
            isOpen ? "border-primary text-primary bg-primary/20" : ""
          }`}
          aria-expanded={isOpen}
        >
          <Filter className="h-4 w-4" />
          Filters
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {(searchTerm ||
            selectedCategoryId ||
            selectedDifficultyId ||
            selectedLanguageId) && (
            <Button
              onClick={resetFilters}
              variant={"outline"}
              className="flex items-center justify-center rounded-md text-blue-500 hover:text-blue-600 text-sm underline"
            >
              <RiFilterOffLine className="h-4 w-4" /> Clear all filters
            </Button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 border bg-muted/70 dark:border-foreground/20 rounded-md bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm">Advanced Filters</h3>
            <button
              onClick={() => toggle()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CategorySelect
              label="Category"
              mode="filter"
              categories={categories}
              value={selectedCategoryId}
              onChange={onCategoryChange}
              includeAllOption
            />
            <DifficultySelect
              label="Difficulty"
              mode="filter"
              difficulties={difficulties}
              value={selectedDifficultyId}
              onChange={onDifficultyChange}
              includeAllOption
            />
            <LanguageSelect
              label="Language"
              mode="filter"
              languages={languages}
              value={selectedLanguageId}
              onChange={onLanguageChange}
              includeAllOption
            />
          </div>
        </div>
      )}
    </div>
  );
};
