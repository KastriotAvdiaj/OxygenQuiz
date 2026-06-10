import { useState, useEffect } from "react";
import { useQuestionCategoryData } from "./Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "./Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "./Entities/Language/api/get-question-language";

import { Card, Spinner, Button } from "@/components/ui";
import { useDebounce } from "@/hooks/use-debounce";
import { useDisclosure } from "@/hooks/use-disclosure";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Filter } from "lucide-react";

// Imports for "Add Question" Dialog
import { LiftedButton } from "@/common/LiftedButton";
import CreateQuestionForm from "./Components/Multiple_Choice_Question/Create-Multiple-Choice-Question-Components/create-multiple-choice-question";
import CreateTrueFalseQuestionForm from "./Components/True_Flase-Question/create-true_false-questions";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateTypeAnswerQuestionForm from "./Components/Type_The_Answer-Question/create-type-the-answer-question";
import { QuestionFilters } from "./Components/Re-Usable-Components/question-filters";
import { CategoryView } from "./Entities/Categories/Components/category-view";
import { DifficultyView } from "./Entities/Difficulty/Components/difficulty-view";
import { LanguagesView } from "./Entities/Language/components/language-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionTabContent } from "./Components/QuestionsTabContent";
import { QuestionType } from "@/types/question-types";
import { Authorization, ROLES } from "@/lib/authorization";
import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";

export const Questions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Multi-select filters — empty array means "all".
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedDifficultyIds, setSelectedDifficultyIds] = useState<number[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);
  // Created-date range (the "within a timeframe" filter). Empty string = unbounded.
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
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Questions Management</h1>
          {/* Mobile Filter Toggle */}
          <Button
            variant="outline"
            className="lg:hidden flex items-center gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Authorization allowedRoles={[ROLES.Admin, ROLES.SuperAdmin]}>
            <DataTransferControls entity="questions" invalidateKey={["questions"]} />
          </Authorization>
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
      </div>

      {/* Mobile Sheet for filters */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-[350px] sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
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
        </SheetContent>
      </Sheet>

      {/* ── Page is a stack of full-width sections, each [content | 350px filter] ── */}
      <div className="flex flex-col gap-6">
        {/* Questions section */}
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
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
                  />
                </TabsContent>

                <TabsContent value={QuestionType.TrueFalse}>
                  <QuestionTabContent
                    questionType={QuestionType.TrueFalse}
                    queryParams={queryParams}
                    onPageChange={handlePageChange}
                    isModalOpen={activeTab === QuestionType.TrueFalse}
                  />
                </TabsContent>

                <TabsContent value={QuestionType.TypeTheAnswer}>
                  <QuestionTabContent
                    questionType={QuestionType.TypeTheAnswer}
                    queryParams={queryParams}
                    onPageChange={handlePageChange}
                    isModalOpen={activeTab === QuestionType.TypeTheAnswer}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Desktop filter sidebar */}
          <aside className="hidden lg:block w-[350px] shrink-0">
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
          </aside>
        </div>

        {/* Admin sections — each renders its own [content | 350px filter] row */}
        <Authorization allowedRoles={[ROLES.Admin, ROLES.SuperAdmin]}>
          <div className="flex flex-col gap-6">
            <CategoryView />
            <DifficultyView />
            <LanguagesView />
          </div>
        </Authorization>
      </div>
    </div>
  );
};
