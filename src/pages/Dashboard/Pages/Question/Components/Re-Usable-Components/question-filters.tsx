import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDisclosure } from "@/hooks/use-disclosure"; // Assuming the modified hook is here

import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import { Button } from "@/components/ui";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { RiFilterOffLine } from "react-icons/ri";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import { SearchInput } from "@/lib/Search-Input";

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
  // 1. Using your custom hook to control the Popover state
  const { isOpen, open, close } = useDisclosure(false);

  const resetFilters = () => {
    onSearchTermChange("");
    onCategoryChange(undefined);
    onDifficultyChange(undefined);
    onLanguageChange(undefined);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedCategoryId ||
    selectedDifficultyId ||
    selectedLanguageId;

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <SearchInput
          placeholder="Search questions..."
          onSearch={onSearchTermChange}
          initialValue={searchTerm}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <Popover
            open={isOpen}
            onOpenChange={() => {
              isOpen ? close() : open();
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
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
            </PopoverTrigger>

            <PopoverContent className="w-auto p-6 dark:border-foreground/30 dark:bg-muted" align="end">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Advanced Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-[280px] sm:min-w-[600px]">
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
                {/* ADD VISIBILITY SELECT */}
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button
              onClick={resetFilters}
              variant="ghost"
              className="flex items-center gap-1.5 rounded-md text-sm text-red-400 hover:text-red-500 bg-red-100/50 hover:bg-red-200 px-4 border border-red-200 hover:border-red-300 h-9"
            >
              <RiFilterOffLine className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
