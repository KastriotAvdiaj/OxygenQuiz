import { useState, useCallback, useEffect } from "react";
import { useSearchQuizzes } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";
import { type FilterQuery } from "@/lib/filtering";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import type { SelectedQuiz } from "../../hooks/use-lobby-connection";
import { SORT_RULES, DEFAULT_SORT } from "@/pages/Quiz/components/quiz-header";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuestionCategoryData } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import { useQuizFilterState } from "@/pages/Quiz/components/quiz-filters";
import { QuizSelectionDialogView } from "./quiz-selection-dialog-view";

// Matches the /choose-quiz page size, so an identical filter/sort/page state reuses its
// React-Query cache entry (key includes the full query object).
const PAGE_SIZE = 12;

interface QuizSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuiz: (quizId: string, quizTitle: string) => void;
  selectedQuiz: SelectedQuiz | null;
}

export const QuizSelectionDialog = ({
  isOpen,
  onClose,
  onSelectQuiz,
  selectedQuiz,
}: QuizSelectionDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  // The facet panel is tucked behind a toggle — dialog space is tight.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Multi-select facets (category / difficulty / language) → `in` filter rules.
  const {
    selections,
    toggle,
    clear: clearFacets,
    filters,
    activeCount: facetCount,
    selectionKey,
  } = useQuizFilterState();

  const { data: categories = [] } = useQuestionCategoryData({});
  const { data: difficulties = [] } = useQuestionDifficultyData({});
  const { data: languages = [] } = useQuestionLanguageData({});

  // No sort control in the dialog — space is tight, so it always uses the
  // "variety" default (same as /choose-quiz; docs/quiz/quiz-discovery.md).
  const query: FilterQuery = {
    page: pageNumber,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sort: [SORT_RULES[DEFAULT_SORT]],
    filters,
  };

  const { data: quizData, isLoading } = useSearchQuizzes({ scope: "public", query });

  const quizzes = quizData?.items ?? [];
  const pagination = quizData ? pagedResponseToPagination(quizData) : undefined;

  // Reset to the first page whenever the filter/search criteria change.
  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch, selectionKey]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    clearFacets();
  }, [clearFacets]);

  const handleQuizSelect = useCallback(
    (quiz: QuizSummaryDTO) => {
      onSelectQuiz(quiz.id.toString(), quiz.title);
      onClose();
    },
    [onSelectQuiz, onClose]
  );

  return (
    <QuizSelectionDialogView
      isOpen={isOpen}
      onClose={onClose}
      selectedQuiz={selectedQuiz}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      resultCount={quizData?.totalItems ?? quizzes.length}
      onClearFilters={clearFilters}
      filtersOpen={filtersOpen}
      onFiltersOpenChange={setFiltersOpen}
      facetCount={facetCount}
      categories={categories}
      difficulties={difficulties}
      languages={languages}
      selections={selections}
      onToggleFacet={toggle}
      onClearFacets={clearFacets}
      isLoading={isLoading}
      quizzes={quizzes}
      onSelectQuiz={handleQuizSelect}
      pagination={pagination}
      onPageChange={setPageNumber}
    />
  );
};
