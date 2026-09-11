import { useState, useEffect } from "react";
import { DataTable, Card, Spinner } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import { quizColumns } from "./components/Data-Table-Columns/columns";
import { useSearchQuizzes } from "./api/search-quizzes";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { useDebounce } from "@/hooks/use-debounce";
import { PaginationControls } from "@/components/ui/pagination-control";
import { pagedResponseToPagination } from "@/lib/pagination-query";

import { useQuestionCategoryData } from "../Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../Question/Entities/Language/api/get-question-language";
import { useUserData } from "../User/api/get-users";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { QuizFiltersPanel } from "./components/Quiz-Filter";
import { CreateQuizMethodDialog } from "./components/create-quiz-method-dialog";
// import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";

export const Quizzes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [difficultyIds, setDifficultyIds] = useState<number[]>([]);
  const [languageIds, setLanguageIds] = useState<number[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [authorIds, setAuthorIds] = useState<string[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});
  const usersQuery = useUserData({});

  const filters: FilterRule[] = [];
  if (categoryIds.length) filters.push(rule.in("categoryId", categoryIds));
  if (difficultyIds.length)
    filters.push(rule.in("difficultyId", difficultyIds));
  if (languageIds.length) filters.push(rule.in("languageId", languageIds));
  if (statuses.length) filters.push(rule.in("status", statuses));
  if (authorIds.length) filters.push(rule.in("userId", authorIds));
  if (createdFrom && createdTo)
    filters.push(rule.between("createdAt", createdFrom, createdTo));
  else if (createdFrom) filters.push(rule.gte("createdAt", createdFrom));
  else if (createdTo) filters.push(rule.lte("createdAt", createdTo));

  const query: FilterQuery = {
    page: pageNumber,
    pageSize,
    search: debouncedSearchTerm || undefined,
    filters,
    includeDeleted: showDeleted,
  };

  const quizData = useSearchQuizzes({ scope: "all", query });

  useEffect(() => {
    setPageNumber(1);
  }, [
    debouncedSearchTerm,
    categoryIds,
    difficultyIds,
    languageIds,
    statuses,
    authorIds,
    createdFrom,
    createdTo,
    showDeleted,
  ]);

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

  const activeFilterCount =
    categoryIds.length +
    difficultyIds.length +
    languageIds.length +
    statuses.length +
    authorIds.length +
    (createdFrom ? 1 : 0) +
    (createdTo ? 1 : 0);

  const filterPanelProps = {
    searchTerm,
    onSearchTermChange: setSearchTerm,
    categories: categoriesQuery.data || [],
    selectedCategoryIds: categoryIds,
    onCategoryIdsChange: setCategoryIds,
    difficulties: difficultiesQuery.data || [],
    selectedDifficultyIds: difficultyIds,
    onDifficultyIdsChange: setDifficultyIds,
    languages: languagesQuery.data || [],
    selectedLanguageIds: languageIds,
    onLanguageIdsChange: setLanguageIds,
    selectedStatuses: statuses,
    onStatusesChange: setStatuses,
    createdFrom,
    createdTo,
    onCreatedFromChange: setCreatedFrom,
    onCreatedToChange: setCreatedTo,
    users: (usersQuery.data || []).map((u) => ({
      id: u.id,
      username: u.username,
    })),
    selectedUserIds: authorIds,
    onUserIdsChange: setAuthorIds,
    showDeleted,
    onShowDeletedChange: setShowDeleted,
  };

  const quizzes = quizData.data?.items ?? [];

  return (
    // `px-4` is gone: DashboardLayout's `main` owns the page gutter now, and the two
    // stacked to 32px on a phone. `py-4 sm:py-8` is the same density step applied
    // vertically — 64px of empty page above the title is a desktop measurement.
    <div className="container mx-auto py-4 sm:py-8">
      {/* ── Page header ──
          One row on desktop, two on phones. A title and its actions fighting over 390px
          is what wrapped this h1 to "Quiz / Management" and broke the Create button's
          label across three lines: `justify-between` has no way to relieve the pressure,
          so both children just shrink until their text wraps. Stacking gives each a full
          width, which is also the phone convention — title, then an action row.

          The h1 is display type and scales with width; the buttons are controls and
          deliberately do not (docs/RESPONSIVE.md). */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Quiz Management</h1>
        <div className="flex items-center gap-2">
          {/* <DataTransferControls entity="quizzes" invalidateKey={["quizzes"]} /> */}
          {/* Same lifted treatment as the Questions page — see the note there for why
              `lg:hidden` sits on `outerClassName` and what `liftColor` controls.

              No `text-*` here, deliberately: this has to stand exactly as tall as the
              "+ Create Quiz" button beside it, and both faces are `py-2` around one line of
              text, so the height is decided entirely by the font-size. The two are siblings
              in this row, so inheriting rather than declaring is what keeps them equal —
              a `text-sm` here made this button 2px shorter than its neighbour. */}
          <LiftedButton
            outerClassName="w-fit lg:hidden"
            className="gap-2 bg-background font-medium text-foreground"
            liftColor="muted"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </LiftedButton>
          {/* Every "which way?" decision for quiz creation, in one place: manual vs AI,
              then what the AI works from. Lives in its own component (and its own story)
              rather than inline here — see create-quiz-method-dialog.tsx. */}
          <CreateQuizMethodDialog
            manualPath="/dashboard/quizzes/create-quiz"
            aiTopicPath="/dashboard/quizzes/create-quiz/ai/topic"
            aiMaterialPath="/dashboard/quizzes/create-quiz/ai/material"
          />
        </div>
      </div>

      {/* ── Content + Sidebar layout ── */}
      <div className="flex gap-6 items-start">
        {/* Table card */}
        <div className="flex-1 min-w-0">
          {/* Card padding is a gutter too — see the note in Questions.tsx. */}
          <Card className="p-4 sm:p-6 bg-card border dark:border-foreground/30">
            {quizData.isError ? (
              <p className="text-center text-red-500 py-8">
                Failed to load quizzes. Please try again later.
              </p>
            ) : quizData.isLoading ? (
              <div className="flex justify-center items-center py-16">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <DataTable data={quizzes} columns={quizColumns} />
                <div className="mt-6">
                  <PaginationControls
                    pagination={
                      quizData.data
                        ? pagedResponseToPagination(quizData.data)
                        : undefined
                    }
                    onPageChange={(newPage) => {
                      setPageNumber(newPage);
                      window.scrollTo(0, 0);
                    }}
                  />
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Sticky scrollable sidebar for desktop */}
        <aside className="hidden lg:block w-80 xl:w-[350px] shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pl-1">
          <QuizFiltersPanel {...filterPanelProps} />
        </aside>
      </div>

      {/* Mobile drawer */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="w-[350px] sm:max-w-md overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <QuizFiltersPanel {...filterPanelProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
};
