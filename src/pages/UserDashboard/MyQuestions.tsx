import { useState, useEffect } from "react";
import { useQuestionCategoryData } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";

import { Card, Spinner } from "@/components/ui";
import { useDebounce } from "@/hooks/use-debounce";
import { useDisclosure } from "@/hooks/use-disclosure";

// "Add Question" dialog forms (shared with the admin page)
import { LiftedButton } from "@/common/LiftedButton";
import CreateQuestionForm from "@/pages/Dashboard/Pages/Question/Components/Multiple_Choice_Question/Create-Multiple-Choice-Question-Components/create-multiple-choice-question";
import CreateTrueFalseQuestionForm from "@/pages/Dashboard/Pages/Question/Components/True_Flase-Question/create-true_false-questions";
import CreateTypeAnswerQuestionForm from "@/pages/Dashboard/Pages/Question/Components/Type_The_Answer-Question/create-type-the-answer-question";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuestionFilters } from "@/pages/Dashboard/Pages/Question/Components/Re-Usable-Components/question-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionTabContent } from "@/pages/Dashboard/Pages/Question/Components/QuestionsTabContent";
import { QuestionType } from "@/types/question-types";

export const MyQuestions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  // Multi-select filters — empty array means "all".
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedDifficultyIds, setSelectedDifficultyIds] = useState<number[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(6);

  const [activeTab, setActiveTab] = useState<QuestionType>(
    QuestionType.MultipleChoice
  );

  const {
    isOpen: isAddQuestionDialogOpen,
    open: openAddQuestionDialog,
    close: closeAddQuestionDialog,
  } = useDisclosure();

  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  const queryParams = {
    pageNumber: pageNumber,
    pageSize: pageSize,
    searchTerm: debouncedSearchTerm || undefined,
    categoryIds: selectedCategoryIds,
    difficultyIds: selectedDifficultyIds,
    languageIds: selectedLanguageIds,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
  };

  useEffect(() => {
    setPageNumber(1);
  }, [
    debouncedSearchTerm,
    selectedCategoryIds,
    selectedDifficultyIds,
    selectedLanguageIds,
    createdFrom,
    createdTo,
    activeTab,
  ]);

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage);
    window.scrollTo(0, 0);
  };

  const isFilterDataLoading =
    categoriesQuery.isLoading ||
    difficultiesQuery.isLoading ||
    languagesQuery.isLoading;

  if (isFilterDataLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Questions</h1>
        <Dialog
          open={isAddQuestionDialogOpen}
          onOpenChange={(open) =>
            open ? openAddQuestionDialog() : closeAddQuestionDialog()
          }>
          <DialogTrigger asChild>
            <LiftedButton className="flex items-center gap-2">
              Add Question +
            </LiftedButton>
          </DialogTrigger>
          <DialogContent className="bg-background p-4 rounded-md w-fit pt-8 dark:border border-foreground/30">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center">
                Choose the type of question
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-4">
              <CreateQuestionForm
                languages={languagesQuery.data || []}
                categories={categoriesQuery.data || []}
                difficulties={difficultiesQuery.data || []}
                onSuccess={closeAddQuestionDialog}
              />
              <CreateTrueFalseQuestionForm
                languages={languagesQuery.data || []}
                categories={categoriesQuery.data || []}
                difficulties={difficultiesQuery.data || []}
                onSuccess={closeAddQuestionDialog}
              />
              <CreateTypeAnswerQuestionForm
                languages={languagesQuery.data || []}
                categories={categoriesQuery.data || []}
                difficulties={difficultiesQuery.data || []}
                onSuccess={closeAddQuestionDialog}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Layout Container */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side: Questions Table / Tabs */}
        <div className="flex-1 w-full">
          <Card className="p-6 bg-card border dark:border-foreground/30">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as QuestionType)}
              className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value={QuestionType.MultipleChoice}>
                  Multiple Choice
                </TabsTrigger>
                <TabsTrigger value={QuestionType.TrueFalse}>True/False</TabsTrigger>
                <TabsTrigger value={QuestionType.TypeTheAnswer}>
                  Type Answer
                </TabsTrigger>
              </TabsList>

              <TabsContent value={QuestionType.MultipleChoice}>
                <QuestionTabContent
                  questionType={QuestionType.MultipleChoice}
                  queryParams={queryParams}
                  onPageChange={handlePageChange}
                  isModalOpen={activeTab === QuestionType.MultipleChoice}
                  scope="mine"
                />
              </TabsContent>

              <TabsContent value={QuestionType.TrueFalse}>
                <QuestionTabContent
                  questionType={QuestionType.TrueFalse}
                  queryParams={queryParams}
                  onPageChange={handlePageChange}
                  isModalOpen={activeTab === QuestionType.TrueFalse}
                  scope="mine"
                />
              </TabsContent>

              <TabsContent value={QuestionType.TypeTheAnswer}>
                <QuestionTabContent
                  questionType={QuestionType.TypeTheAnswer}
                  queryParams={queryParams}
                  onPageChange={handlePageChange}
                  isModalOpen={activeTab === QuestionType.TypeTheAnswer}
                  scope="mine"
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Side: Filters Sidebar */}
        <div className="w-full lg:w-80 shrink-0 sticky top-4">
            <QuestionFilters
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              categories={categoriesQuery.data || []}
              selectedCategoryIds={selectedCategoryIds}
              onCategoryIdsChange={setSelectedCategoryIds}
              difficulties={difficultiesQuery.data || []}
              selectedDifficultyIds={selectedDifficultyIds}
              onDifficultyIdsChange={setSelectedDifficultyIds}
              languages={languagesQuery.data || []}
              selectedLanguageIds={selectedLanguageIds}
              onLanguageIdsChange={setSelectedLanguageIds}
              createdFrom={createdFrom}
              createdTo={createdTo}
              onCreatedFromChange={setCreatedFrom}
              onCreatedToChange={setCreatedTo}
            />
        </div>
      </div>
    </div>
  );
};