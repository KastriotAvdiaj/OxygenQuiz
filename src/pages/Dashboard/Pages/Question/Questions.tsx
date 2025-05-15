import { useState, useEffect } from "react";
import { useQuestionCategoryData } from "./Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "./Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "./Entities/Language/api/get-question-language";

import { Card, Spinner } from "@/components/ui";
import { useDebounce } from "@/hooks/use-debounce";
import { useDisclosure } from "@/hooks/use-disclosure";

// Imports for "Add Question" Dialog
import { LiftedButton } from "@/common/LiftedButton";
import CreateQuestionForm from "./Components/Multiple_Choice_Question/Create-Question-Components/create-multiple-choice-question";
import CreateTrueFalseQuestionForm from "./Components/True_Flase-Question/create-true_false-questions";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateTypeAnswerQuestionForm from "./Components/Type_The_Answer-Question/create-type-the-answer-question";
import { Separator } from "@/components/ui/separator";
import { QuestionFilters } from "./Re-Usable-Components/question-filters";
import { CategoryView } from "./Entities/Categories/Components/category-view";
import { DifficultyView } from "./Entities/Difficulty/Components/difficulty-view";
import { LanguagesView } from "./Entities/Language/components/language-view";
import { QuestionType } from "@/types/ApiTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionTabContent } from "./Components/QuestionsTabContent";

export const Questions = () => {
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
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);

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
    categoryId: selectedCategoryId,
    difficultyId: selectedDifficultyId,
    languageId: selectedLanguageId,
    // visibility: "published"
  };

  useEffect(() => {
    setPageNumber(1);
  }, [
    debouncedSearchTerm,
    selectedCategoryId,
    selectedDifficultyId,
    selectedLanguageId,
    activeTab,
  ]);

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage);
    window.scrollTo(0, 0);
  };

  // Check if filter data is still loading
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
        <h1 className="text-3xl font-bold">Questions Management</h1>
        <Dialog
          open={isAddQuestionDialogOpen}
          onOpenChange={(open) =>
            open ? openAddQuestionDialog() : closeAddQuestionDialog()
          }
        >
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

      <Card className="p-6 bg-card border dark:border-foreground/30">
        {/* Filters section - shared across all question types */}
        <QuestionFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          categories={categoriesQuery.data || []}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={(value) => setSelectedCategoryId(value)}
          difficulties={difficultiesQuery.data || []}
          selectedDifficultyId={selectedDifficultyId}
          onDifficultyChange={(value) => setSelectedDifficultyId(value)}
          languages={languagesQuery.data || []}
          selectedLanguageId={selectedLanguageId}
          onLanguageChange={(value) => setSelectedLanguageId(value)}
        />

        <Separator className="my-6" />

        {/* Tabs for switching between question types */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as QuestionType)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value={QuestionType.MultipleChoice}>
              Multiple Choice
            </TabsTrigger>
            <TabsTrigger value={QuestionType.TrueFalse}>True/False</TabsTrigger>
            <TabsTrigger value={QuestionType.TypeTheAnswer}>
              Type Answer
            </TabsTrigger>
          </TabsList>

          {/* Always render all tab content but conditionally show based on active tab */}
          <TabsContent value={QuestionType.MultipleChoice}>
            <QuestionTabContent
              questionType={QuestionType.MultipleChoice}
              queryParams={queryParams}
              onPageChange={handlePageChange}
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
      </Card>

      <div className="flex flex-col gap-6 mt-6">
        <CategoryView />
        <DifficultyView />
        <LanguagesView />
      </div>
    </div>
  );
};
