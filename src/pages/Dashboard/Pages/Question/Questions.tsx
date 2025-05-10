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
// Keep other imports like CategoryView etc. if they are part of this page's layout

export const Questions = () => {
  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useDebounce(
    searchTerm,
    500
  ); // Increased debounce
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | undefined
  >();
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<
    number | undefined
  >();
  const [selectedLanguageId, setSelectedLanguageId] = useState<
    number | undefined
  >();

  // State for pagination
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10); // Or make this configurable

  // For "Add Question" Dialog
  const {
    isOpen: isAddQuestionDialogOpen,
    open: openAddQuestionDialog,
    close: closeAddQuestionDialog,
  } = useDisclosure();

  // Fetching data for filters
  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  // Fetching Multiple Choice Questions
  const mcqQuery = useMultipleChoiceQuestionData({
    params: {
      pageNumber: pageNumber,
      pageSize: pageSize,
      searchTerm: debouncedSearchTerm || undefined, // Send undefined if empty
      categoryId: selectedCategoryId,
      difficultyId: selectedDifficultyId,
      languageId: selectedLanguageId,
      // visibility: "published" // Example: if you want to filter by visibility
    },
    queryConfig: {
      // keepPreviousData: true, // Consider for smoother pagination
    },
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setPageNumber(1);
  }, [
    debouncedSearchTerm,
    selectedCategoryId,
    selectedDifficultyId,
    selectedLanguageId,
  ]);

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage);
    // Optionally scroll to top
    // window.scrollTo(0, 0);
  };

  // Loading state for main content (questions)
  if (mcqQuery.isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state for main content
  if (mcqQuery.isError) {
    return (
      <p className="text-center text-red-500 py-8">
        Failed to load questions. Please try again later.
      </p>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      {" "}
      {/* Added container for better layout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Questions Management</h1>
        {/* "Add Question" Dialog Trigger */}
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
              {" "}
              {/* Added mt-4 for spacing */}
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
                // onSuccess={closeAddQuestionDialog}
              />
              <CreateTypeAnswerQuestionForm
                languages={languagesQuery.data || []}
                categories={categoriesQuery.data || []}
                difficulties={difficultiesQuery.data || []}
                // onSuccess={closeAddQuestionDialog}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="p-6 bg-card border dark:border-foreground/30">
        {" "}
        {/* Changed from bg-background */}
        <QuestionFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          categories={categoriesQuery.data || []}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={(value) =>
            setSelectedCategoryId(
              value === undefined || value === "all"
                ? undefined
                : Number(value)
            )
          }
          difficulties={difficultiesQuery.data || []}
          selectedDifficultyId={selectedDifficultyId}
          onDifficultyChange={(value) =>
            setSelectedDifficultyId(
              value === undefined || value === "all"
                ? undefined
                : Number(value)
            )
          }
          languages={languagesQuery.data || []}
          selectedLanguageId={selectedLanguageId}
          onLanguageChange={(value) =>
            setSelectedLanguageId(
              value === undefined || value === "all"
                ? undefined
                : Number(value)
            )
          }
        />
        {/* Loading/Error for filter data can be handled within QuestionFilters or here with spinners beside each select */}
        {(categoriesQuery.isLoading ||
          difficultiesQuery.isLoading ||
          languagesQuery.isLoading) && (
          <div className="text-center my-4">
            <Spinner /> <span className="ml-2">Loading filter options...</span>
          </div>
        )}
        <Separator className="my-6" />
        <MultipleChoiceQuestionList questions={mcqQuery.data?.data || []} />
        <PaginationControls
          pagination={mcqQuery.data?.pagination}
          onPageChange={handlePageChange}
        />
      </Card>
      {/* Keep other views if they are part of this page's layout */}
      <div className="flex flex-col gap-6 mt-6">
        <CategoryView />
        <DifficultyView />
        <LanguagesView />
      </div>
    </div>
  );
};
