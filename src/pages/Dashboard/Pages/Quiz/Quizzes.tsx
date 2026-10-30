import { useState, useEffect } from "react";
import { DataTable, Card } from "@/components/ui";
import { FilterPanelSkeleton, TableSkeleton } from "../../Components/list-page-skeletons";
import { LiftedButton } from "@/common/LiftedButton";
import { quizColumns } from "./components/Data-Table-Columns/columns";
import { useSearchQuizzes } from "./api/search-quizzes";
import { ADMIN_QUIZZES_PAGE_SIZE, buildAdminQuizzesQuery } from "./api/admin-quizzes-query";
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
import { cn } from "@/utils/cn";
import { QuizFiltersPanel } from "./components/Quiz-Filter";
import { CreateQuizMethodDialog } from "./components/create-quiz-method-dialog";
import { HEADER_ACTION_FACE } from "./components/header-action-face";
import { quizViewPath } from "./quiz-paths";
import { useNavigate } from "react-router-dom";
// import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";

export const Quizzes = () => {
  const navigate = useNavigate();
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});
  const usersQuery = useUserData({});

  // Built by the same function the route's prefetch uses (api/admin-quizzes-query.ts), so the
  // first page is already in the cache when the page mounts.
  const query = buildAdminQuizzesQuery({
    pageNumber,
    search: debouncedSearchTerm,
    categoryIds,
    difficultyIds,
    languageIds,
    statuses,
    authorIds,
    createdFrom,
    createdTo,
    showDeleted,
  });

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

  // <b>No full-page gate.</b> This used to return a full-height BlobLoader until the three lookups
  // had loaded, so the header and the table — which don't need them — waited too. Now only the
  // filter panel waits (with its own skeleton), and the table shows its own while the page of
  // quizzes loads. See docs/development/loading-states.md §2.1.

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

              The text size comes from `HEADER_ACTION_FACE`, the same string the
              "+ Create Quiz" trigger uses: both faces are `py-2` around one line, so height
              is decided by font-size alone, and a size on one but not the other made this
              button 2px shorter than its neighbour. */}
          <LiftedButton
            outerClassName="w-fit lg:hidden"
            className={cn("gap-2 bg-background font-medium text-foreground", HEADER_ACTION_FACE)}
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
            associationsPath="/dashboard/quizzes/create-quiz/associations"
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
              <TableSkeleton rows={ADMIN_QUIZZES_PAGE_SIZE} />
            ) : (
              <>
                {/* A click anywhere on the row opens the quiz; the ⋯ menu keeps its own clicks.
                    Not for a soft-deleted row (shown with "show deleted"): it has no page. */}
                <DataTable
                  data={quizzes}
                  columns={quizColumns}
                  onRowClick={(quiz) => {
                    if (!quiz.deletedAt) navigate(quizViewPath(quiz));
                  }}
                />
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
          {isFilterDataLoading ? <FilterPanelSkeleton /> : <QuizFiltersPanel {...filterPanelProps} />}
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
          {isFilterDataLoading ? <FilterPanelSkeleton /> : <QuizFiltersPanel {...filterPanelProps} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};
