import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { QuestionBase, QuestionType } from "@/types/ApiTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import { QuestionFilters } from "../../../../../Question/Components/Re-Usable-Components/question-filters";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuestionCategoryData } from "../../../../../Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../../../../../Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../../../../../Question/Entities/Language/api/get-question-language";
import { QuestionTabContent } from "../../../../../Question/Components/QuestionsTabContent";
import { cn } from "@/utils/cn";
import { useQuiz } from "../../Quiz-questions-context";
import { useDisclosure } from "@/hooks/use-disclosure";

interface SelectQuestionComponentProps {
  onQuestionsSelected?: (questions: QuestionBase[]) => void;
  maxSelections?: number;
  preSelectedQuestionIds?: number[];
  title?: string;
  excludeQuestionIds?: number[];
}

const SelectQuestionComponent: React.FC<SelectQuestionComponentProps> = ({
  onQuestionsSelected,
  maxSelections,
  title = "Select Questions from Pool",
  // excludeQuestionIds = [],
}) => {
  const { open, close, isOpen } = useDisclosure();
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

  const {
    tempSelectedQuestionsCount,
    commitTempSelection,
    clearTempSelection,
    setQuestionModalOpen,
  } = useQuiz();

  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;

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
    visibility: "Public",
    // excludeIds: excludeQuestionIds, //needs to be added
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

  const handleOpen = () => {
    open();
    setQuestionModalOpen(true);
  };

  const handleClose = () => {
    close();
    setQuestionModalOpen(false);
  };

  const handleAddSelectedQuestions = () => {
    commitTempSelection();

    // Call the callback if provided
    if (onQuestionsSelected) {
      // You might need to pass the committed questions here
      // onQuestionsSelected(tempSelectedQuestions);
    }

    handleClose();
  };

  const handleCancel = () => {
    clearTempSelection();
    handleClose();
  };

  return (
    <>
      <LiftedButton onClick={handleOpen} className="h-fit" type="button">
        <Plus className="h-4 w-4" />
        Add Existing
      </LiftedButton>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
          />

          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </h2>
                {maxSelections && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Maximum {maxSelections} questions can be selected
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      tempSelectedQuestionsCount > 0
                        ? "bg-orange-500"
                        : "bg-gray-300"
                    )}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tempSelectedQuestionsCount} selected
                    {maxSelections && ` / ${maxSelections}`}
                  </span>
                </div>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
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

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as QuestionType)}
                className="w-full mt-4"
              >
                <TabsList className="grid grid-cols-3 mb-6 bg-gray-100 dark:bg-gray-800">
                  <TabsTrigger
                    value={QuestionType.MultipleChoice}
                    className="data-[state=active]:bg-primary/80"
                  >
                    Multiple Choice
                  </TabsTrigger>
                  <TabsTrigger
                    value={QuestionType.TrueFalse}
                    className="data-[state=active]:bg-primary/80"
                  >
                    True/False
                  </TabsTrigger>
                  <TabsTrigger
                    value={QuestionType.TypeTheAnswer}
                    className="data-[state=active]:bg-primary/80"
                  >
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
                    page="user"
                  />
                </TabsContent>

                <TabsContent value={QuestionType.TypeTheAnswer}>
                  <QuestionTabContent
                    questionType={QuestionType.TypeTheAnswer}
                    queryParams={queryParams}
                    onPageChange={handlePageChange}
                    page="user"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full transition-colors",
                    tempSelectedQuestionsCount > 0
                      ? "bg-orange-500"
                      : "bg-gray-300"
                  )}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {tempSelectedQuestionsCount} question
                  {tempSelectedQuestionsCount !== 1 ? "s" : ""} selected
                  {maxSelections && ` (max: ${maxSelections})`}
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSelectedQuestions}
                  disabled={tempSelectedQuestionsCount === 0}
                  className={cn(
                    "transition-all duration-200",
                    tempSelectedQuestionsCount > 0
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  Add Selected Questions ({tempSelectedQuestionsCount})
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
