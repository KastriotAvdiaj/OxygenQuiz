// src/app/questions/Questions.tsx (or wherever it is)
import { useState, useEffect } from "react";
import { useMultipleChoiceQuestionData } from "./api/Normal-Question/get-multiple-choice-questions"; // Keep your API hook
import { useQuestionCategoryData } from "./Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "./Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "./Entities/Language/api/get-question-language";

import { Card, Spinner } from "@/components/ui";
import { useDebounce } from "@/hooks/use-debounce";
import { useDisclosure } from "@/hooks/use-disclosure";

// Imports for "Add Question" Dialog (keep these as they are if they work for you)
import { LiftedButton } from "@/common/LiftedButton";
import CreateQuestionForm from "./Components/Normal-Question/Create-Question-Components/create-question";
import CreateTrueFalseQuestionForm from "./Components/True_Flase-Question/create-true_false-questions";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateTypeAnswerQuestionForm from "./Components/Type_The_Answer-Question/create-type-the-answer-question";
import { MultipleChoiceQuestionList } from "./Components/Normal-Question/multiple-choice-question-list";
import { Separator } from "@/components/ui/separator";
import { PaginationControls } from "./Re-Usable-Components/pagination-control";
import { QuestionFilters } from "./Re-Usable-Components/question-filters";
import { CategoryView } from "./Entities/Categories/Components/category-view";
import { DifficultyView } from "./Entities/Difficulty/Components/difficulty-view";
import { LanguagesView } from "./Entities/Language/components/language-view";
import { QuestionType } from "@/types/ApiTypes";
import { useTrueFalseQuestionData } from "./api/True_False-Question/get-true_false-questions";
import { useTypeTheAnswerQuestionData } from "./api/Type_The_Answer-Question/get-type-the-answer-questions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrueFalseQuestionList } from "./Components/Type_The_Answer-Question/true-false-question-list";

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

  const mcqQuery = useMultipleChoiceQuestionData({
    params: queryParams,
    queryConfig: {
      enabled: activeTab === QuestionType.MultipleChoice,
      // keepPreviousData: true, // Consider for smoother pagination
    },
  });

  const trueFalseQuery = useTrueFalseQuestionData({
    params: queryParams,
    queryConfig: {
      enabled: activeTab === QuestionType.TrueFalse,
    },
  });

  const typeAnswerQuery = useTypeTheAnswerQuestionData({
    params: queryParams,
    queryConfig: {
      enabled: activeTab === QuestionType.TypeTheAnswer,
    },
  });

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

  const getActiveQuery = () => {
    switch (activeTab) {
      case QuestionType.MultipleChoice:
        return mcqQuery;
      case QuestionType.TrueFalse:
        return trueFalseQuery;
      case QuestionType.TypeTheAnswer:
        return typeAnswerQuery;
      default:
        return mcqQuery;
    }
  };

  if (mcqQuery.isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeQuery = getActiveQuery();

  if (activeQuery.isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (activeQuery.isError) {
    return (
      <p className="text-center text-red-500 py-8">
        Failed to load questions. Please try again later.
      </p>
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

        {(categoriesQuery.isLoading ||
          difficultiesQuery.isLoading ||
          languagesQuery.isLoading) && (
          <div className="text-center my-4">
            <Spinner /> <span className="ml-2">Loading filter options...</span>
          </div>
        )}

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
            {/* <TabsTrigger value="type-answer">Type Answer</TabsTrigger> */}
          </TabsList>

          {/* Tab content for Multiple Choice questions */}
          <TabsContent value={QuestionType.MultipleChoice}>
            <MultipleChoiceQuestionList questions={mcqQuery.data?.data || []} />
            <PaginationControls
              pagination={mcqQuery.data?.pagination}
              onPageChange={handlePageChange}
            />
          </TabsContent>

          {/* Tab content for True/False questions */}
          <TabsContent value={QuestionType.TrueFalse}>
            <TrueFalseQuestionList
              questions={trueFalseQuery.data?.data || []}
            />
            <PaginationControls
              pagination={trueFalseQuery.data?.pagination}
              onPageChange={handlePageChange}
            />
          </TabsContent>

          {/* Tab content for Type Answer questions */}
          {/* <TabsTrigger value={QuestionType.TypeTheAnswer}>
            <TypeAnswerQuestionList questions={typeAnswerQuery.data?.data || []} />
            <PaginationControls
              pagination={typeAnswerQuery.data?.pagination}
              onPageChange={handlePageChange}
            />
          </TabsContent> */}
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
