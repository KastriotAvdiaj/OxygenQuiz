import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { QuestionBase, QuestionType } from "@/types/ApiTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import { QuestionFilters } from "../../../Question/Components/Re-Usable-Components/question-filters";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuestionCategoryData } from "../../../Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../../../Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../../../Question/Entities/Language/api/get-question-language";
import { QuestionTabContent } from "../../../Question/Components/QuestionsTabContent";
// import { useNotifications } from "@/common/Notifications";

interface SelectQuestionComponentProps {
  onQuestionsSelected?: (questions: QuestionBase[]) => void;
  maxSelections?: number;
  preSelectedQuestionIds?: number[];
  title?: string;
  excludeQuestionIds?: number[]; // To exclude already added questions
}

const SelectQuestionComponent: React.FC<SelectQuestionComponentProps> = ({
  onQuestionsSelected,
  maxSelections,
  preSelectedQuestionIds = [],
  title = "Select Questions from Pool",
  excludeQuestionIds = [],
}) => {
  // Dialog state
  const [isOpen, setIsOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | undefined
  >();
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<
    number | undefined
  >();
  const [selectedLanguageId, setSelectedLanguageId] = useState<
    number | undefined
  >();
  const [activeTab, setActiveTab] = useState(QuestionType.MultipleChoice);

  // const { addNotification } = useNotifications();

  // Selection and pagination states
  const [selectedQuestions, setSelectedQuestions] = useState(
    new Set(preSelectedQuestionIds)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;

  // Data fetching hooks
  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  const queryParams = {
    pageNumber: currentPage,
    pageSize: questionsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
    categoryId: selectedCategoryId,
    difficultyId: selectedDifficultyId,
    languageId: selectedLanguageId,
    questionType: activeTab,
    visibility: "Public", // Only public questions for selection
    excludeIds: excludeQuestionIds, // Exclude already added questions NEEDS TO BE ADDED
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedCategoryId,
    selectedDifficultyId,
    selectedLanguageId,
    activeTab,
  ]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <>
      <LiftedButton onClick={() => setIsOpen(true)} className="h-fit">
        <Plus className="h-4 w-4" />
        Add Questions from Pool
      </LiftedButton>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog Content */}
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {maxSelections && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Maximum {maxSelections} questions can be selected
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedQuestions.size} selected
                  {maxSelections && ` / ${maxSelections}`}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Filters */}
              <QuestionFilters
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                categories={categoriesQuery.data || []}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={setSelectedCategoryId}
                difficulties={difficultiesQuery.data || []}
                selectedDifficultyId={selectedDifficultyId}
                onDifficultyChange={setSelectedDifficultyId}
                languages={languagesQuery.data || []}
                selectedLanguageId={selectedLanguageId}
                onLanguageChange={setSelectedLanguageId}
              />

              {/* Question Type Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as QuestionType)}
                className="w-full mt-4"
              >
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value={QuestionType.MultipleChoice}>
                    Multiple Choice
                  </TabsTrigger>
                  <TabsTrigger value={QuestionType.TrueFalse}>
                    True/False
                  </TabsTrigger>
                  <TabsTrigger value={QuestionType.TypeTheAnswer}>
                    Type Answer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={QuestionType.MultipleChoice}>
                  <QuestionTabContent
                    questionType={QuestionType.MultipleChoice}
                    queryParams={queryParams}
                    onPageChange={handlePageChange}
                    page="user"
                  />
                </TabsContent>

                <TabsContent value={QuestionType.TrueFalse}>
                  <QuestionTabContent
                    questionType={QuestionType.TrueFalse}
                    queryParams={queryParams}
                    onPageChange={handlePageChange}
                  />
                </TabsContent>

                <TabsContent value={QuestionType.TypeTheAnswer}>
                  <QuestionTabContent
                    questionType={QuestionType.TypeTheAnswer}
                    queryParams={queryParams}
                    onPageChange={handlePageChange}
                  />
                </TabsContent>
              </Tabs>
            </div>
            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedQuestions.size} question
                {selectedQuestions.size !== 1 ? "s" : ""} selected
                {maxSelections && ` (max: ${maxSelections})`}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  className="border border-foreground/30 hover:bg-background"
                >
                  Cancel
                </Button>
                <Button
                  // onClick={handleAddSelectedQuestions}
                  disabled={selectedQuestions.size === 0}
                >
                  Add Selected Questions ({selectedQuestions.size})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SelectQuestionComponent;
