import { useState, useEffect } from "react";
import { useQuestionCategoryData } from "./Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "./Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "./Entities/Language/api/get-question-language";

import { Card, Spinner } from "@/components/ui";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionTabContent } from "./Components/QuestionsTabContent";
import { QuestionType } from "@/types/question-types";
// import { Authorization, ROLES } from "@/lib/authorization";
// import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";

export const Questions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
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
    // Gutters and vertical rhythm: see the matching note in Quizzes.tsx — `main` owns the
    // page padding now, and this was doubling it on phones.
    <div className="container mx-auto py-4 sm:py-8">
      {/* Title and its actions get a row each on phones, one shared row from `sm`. Sharing a
          390px line is what wrapped this heading to "Questions / Management". */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Questions Management</h1>
        {/* Mobile Filter Toggle.
            `lg:hidden` and the width go on `outerClassName`, not `className`: the latter
            styles the front FACE, so hiding it there would leave the button's own box —
            and its shadow and edge layers — still laid out and still taking a row.
            `liftColor` drives the depth layers (edge gradient + drop shadow) off
            `--lift-base`; "muted" keeps the 3D under a background-coloured face instead of
            the default primary blue, which would read as a blue button with a white top. */}
        <LiftedButton
          outerClassName="w-fit lg:hidden"
          className="gap-2 bg-background font-medium text-foreground"
          liftColor="muted"
          onClick={() => setFiltersOpen(true)}
        >
          <Filter className="h-4 w-4" />
          Filters
        </LiftedButton>
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
            {/* Card padding is a gutter too: 24px each side inside a page that already
                indents is 48px of a phone spent on nothing. */}
            <Card className="p-4 sm:p-6 bg-card border dark:border-foreground/30">
             <div className="flex items-center justify-between gap-3 p-2 mb-4">
              <Dialog
                open={isAddQuestionDialogOpen}
                onOpenChange={(open) =>
                  open ? openAddQuestionDialog() : closeAddQuestionDialog()
                }>
                <DialogTrigger asChild>
                  <LiftedButton className="flex items-center gap-2 text-xs">
                    Add Question +
                  </LiftedButton>
                </DialogTrigger>
              {/* sm:max-w-sm, not the shared max-w-lg: three stacked buttons in a 512px
                  shell read as a half-empty panel. `w-fit` used to be here and did nothing
                  useful — the buttons inside are full-width, so fit-content just resolved
                  back to the max-width while also fighting the phone gutter DialogContent
                  applies for every dialog (docs/RESPONSIVE.md). */}
              <DialogContent className="bg-background p-4 rounded-md pt-8 sm:max-w-sm dark:border border-foreground/30">
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
            {/* <Authorization allowedRoles={[ROLES.Admin, ROLES.SuperAdmin]}>
            <DataTransferControls entity="questions" invalidateKey={["questions"]} />
          </Authorization> */}
        </div>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as QuestionType)}
                className="w-full">
                {/* Three equal columns holding labels as long as "Multiple Choice" is the
                    thing that was spilling out of this control on a phone: TabsTrigger is
                    `whitespace-nowrap px-4`, so at ~96px a column the text simply ran past
                    its cell.

                    The fix is to let the label WRAP, not to shrink it. Type size and hit
                    area are control density, and density does not scale with width
                    (docs/RESPONSIVE.md) — a 12px tab label is harder to read on the device
                    held closest to your face. So the control gets taller instead: `h-auto`
                    on the list, two lines allowed inside a trigger, and a min-height that
                    keeps the single-line tabs at the 44px touch floor.

                    `sm:min-h-0` is not tidying-up — it is load-bearing. From `sm` the list
                    goes back to a fixed `h-12`, which leaves 36px inside its `p-1.5`; a
                    trigger still asking for 44px cannot fit and grows straight out through
                    the bottom of the pill. The min-height belongs only to the width where
                    the list is `h-auto` and can grow with it. */}
                <TabsList className="mb-6 grid h-auto grid-cols-3 gap-1 sm:h-12 sm:gap-4">
                  <TabsTrigger
                    className="min-h-[2.75rem] whitespace-normal px-2 leading-tight sm:min-h-0 sm:whitespace-nowrap sm:px-4"
                    value={QuestionType.MultipleChoice}>
                    Multiple Choice
                  </TabsTrigger>
                  <TabsTrigger
                    className="min-h-[2.75rem] whitespace-normal px-2 leading-tight sm:min-h-0 sm:whitespace-nowrap sm:px-4"
                    value={QuestionType.TrueFalse}>
                    True/False
                  </TabsTrigger>
                  <TabsTrigger
                    className="min-h-[2.75rem] whitespace-normal px-2 leading-tight sm:min-h-0 sm:whitespace-nowrap sm:px-4"
                    value={QuestionType.TypeTheAnswer}>
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
      </div>
    </div>
  );
};
