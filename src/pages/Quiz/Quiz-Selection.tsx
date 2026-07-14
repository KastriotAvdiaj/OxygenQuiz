import { useState, useCallback, useEffect } from "react";
import { QuizCard } from "./components/quiz-card";
import {
  QuizToolbar,
  SORT_RULES,
  DEFAULT_SORT,
  type SortOption,
} from "./components/quiz-header";
import { motion } from "framer-motion";
import { ArchiveX, ArrowLeft, ListFilter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuizStartModal } from "./components/quiz-start-modal";
import { QuizSummaryDTO } from "@/types/quiz-types";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchQuizzes } from "../Dashboard/Pages/Quiz/api/search-quizzes";
import { type FilterQuery } from "@/lib/filtering";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import { PaginationControls } from "@/components/ui/pagination-control";
import { LoadingWave } from "@/components/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuestionCategoryData } from "../Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import {
  QuizFilterPanel,
  useQuizFilterState,
  type QuizFacetKey,
} from "./components/quiz-filters";

// Number of quiz cards shown per page.
const PAGE_SIZE = 12;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

// Single-player only: multiplayer hosts pick their quiz inside the lobby
// (Multiplayer/components/lobby/quiz-selection-dialog.tsx), which shares the
// same QuizToolbar + QuizFilterPanel. The old ?mode=multiplayer branch here
// was dead code.
export function QuizSelection() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  // Defaults to "variety": the first page interleaves categories so new users see
  // the breadth of quizzes on offer (docs/quiz/quiz-discovery.md).
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizSummaryDTO | null>(null);
  const { close, open, isOpen } = useDisclosure();

  // Debounce search so we don't fire a request on every keystroke.
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Facet changes reset the page in the same render — resetting in an effect
  // fired one render late and briefly queried an out-of-range page.
  const resetPage = useCallback(() => setPageNumber(1), []);

  // Multi-select facets (category / difficulty / language) → `in` filter rules.
  const {
    selections,
    toggle,
    clear: clearFacets,
    filters,
    activeCount: facetCount,
    selectionKey,
  } = useQuizFilterState(resetPage);

  // Filter option lists (with ids) — the API filters by id, not by name.
  const { data: categories = [] } = useQuestionCategoryData({});
  const { data: difficulties = [] } = useQuestionDifficultyData({});
  const { data: languages = [] } = useQuestionLanguageData({});

  // Build the server-side query: search + filters + sort + paging, all handled by
  // the public quiz catalogue endpoint (/quiz/search, scope "public").
  const query: FilterQuery = {
    page: pageNumber,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sort: [SORT_RULES[sortBy]],
    filters,
  };

  const { data: quizData, isLoading } = useSearchQuizzes({ scope: "public", query });

  const quizzes = quizData?.items ?? [];
  const pagination = quizData ? pagedResponseToPagination(quizData) : undefined;

  const hasActiveFilters = Boolean(searchQuery) || facetCount > 0;
  const activeFilterCount = (searchQuery ? 1 : 0) + facetCount;

  // Dismissible chips shown in the results header — one per active filter value.
  const filterChips: { key: string; label: string; onClear: () => void }[] = [];
  if (searchQuery)
    filterChips.push({
      key: "search",
      label: `“${searchQuery}”`,
      onClear: () => setSearchQuery(""),
    });
  const chipSources: {
    facet: QuizFacetKey;
    ids: number[];
    labelOf: (id: number) => string | undefined;
  }[] = [
    {
      facet: "categoryIds",
      ids: selections.categoryIds,
      labelOf: (id) => categories.find((c) => c.id === id)?.name,
    },
    {
      facet: "difficultyIds",
      ids: selections.difficultyIds,
      labelOf: (id) => difficulties.find((d) => d.id === id)?.level,
    },
    {
      facet: "languageIds",
      ids: selections.languageIds,
      labelOf: (id) => languages.find((l) => l.id === id)?.language,
    },
  ];
  for (const { facet, ids, labelOf } of chipSources) {
    for (const id of ids) {
      const label = labelOf(id);
      if (label)
        filterChips.push({
          key: `${facet}-${id}`,
          label,
          onClear: () => toggle(facet, id),
        });
    }
  }

  const resultCount = pagination?.totalItems ?? quizzes.length;

  // Search is debounced, so its page reset happens when the debounced value lands.
  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch]);

  const handleSortChange = useCallback((v: SortOption) => {
    setSortBy(v);
    setPageNumber(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    clearFacets();
    setPageNumber(1);
  }, [clearFacets]);

  const handleQuizClick = useCallback(
    (quiz: QuizSummaryDTO) => {
      setSelectedQuiz(quiz);
      open();
    },
    [open]
  );

  const handleCloseModal = useCallback(() => {
    close();
    setSelectedQuiz(null);
  }, [close]);

  const handleStartQuiz = useCallback(
    (quizId: number) => {
      close();
      navigate(`/quiz/${quizId}/play`);
    },
    [navigate, close]
  );

  const filterPanel = (
    <QuizFilterPanel
      categories={categories}
      difficulties={difficulties}
      languages={languages}
      selections={selections}
      onToggle={toggle}
      onClearAll={clearFacets}
      activeCount={facetCount}
    />
  );

  return (
    <div className="relative text-foreground bg-cover bg-center tracking-wider h-full bg-muted">
      {/* Wide-but-capped layout: the sidebar + grid want more room than the
          default `container` (1280–1536px), but full-bleed reads sparse on
          very large monitors — 1700px is the sweet spot. */}
      <div className="relative mx-auto w-full max-w-[1700px] px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 pb-8 sm:pb-12 md:pb-16">
        {/* Compact header: back link + small title in one row. Keeps
            orientation without spending a hero block on it. */}
        <div className="mb-4 sm:mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/choose-mode")}
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Mode Selection</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="h-4 w-px bg-border" aria-hidden />
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Select a Quiz
          </h2>
        </div>

        {/* Facet sidebar (desktop) + everything else on its right */}
        <div className="lg:flex lg:items-start lg:gap-6">
          <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-6 self-start">
            {filterPanel}
          </aside>

          <div className="min-w-0 flex-1">
            {/* Toolbar — search + sort; facets live in the sidebar/drawer */}
            <div className="mb-4 sm:mb-5">
              <QuizToolbar
                showCount={false}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                resultCount={resultCount}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                filterAction={
                  /* Mobile/tablet: the facet panel slides in as a drawer */
                  <Sheet>
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-2 border-primary/60 dark:border-primary/70 bg-background text-sm font-medium shadow-[0_2px_0_0_var(--primary-edge)] hover:border-primary/80 active:shadow-none active:translate-y-0.5 transition-all"
                      >
                        <ListFilter className="h-4 w-4 text-primary/70" />
                        Filters
                        {facetCount > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white tabular-nums">
                            {facetCount}
                          </span>
                        )}
                      </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 overflow-y-auto p-4">
                      <SheetHeader className="sr-only">
                        <SheetTitle>Filters</SheetTitle>
                      </SheetHeader>
                      {filterPanel}
                    </SheetContent>
                  </Sheet>
                }
              />
            </div>

            {/* Results header — visually separates the toolbar from the quiz grid.
                The match-count pill and filter chips only appear while filtering:
                a total is noise when browsing everything, but useful feedback once
                the user has narrowed things down. */}
            <div className="mb-5 sm:mb-6 md:mb-7 flex flex-wrap items-center gap-2 sm:gap-3">
              {hasActiveFilters && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary/60 dark:border-primary/70 bg-background px-3 py-1 text-xs font-header font-semibold text-primary shadow-[0_2px_0_0_var(--primary-edge)] whitespace-nowrap tabular-nums">
                    <ListFilter className="h-3.5 w-3.5" />
                    {isLoading
                      ? "Searching…"
                      : `${resultCount.toLocaleString()} ${
                          resultCount === 1 ? "match" : "matches"
                        }`}
                  </span>
                  {filterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onClear}
                      title="Remove filter"
                      className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      {chip.label}
                      <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
                </>
              )}
              <div className="h-px flex-1 min-w-[3rem] bg-gradient-to-r from-primary/40 via-primary/15 to-transparent" />
            </div>

            {/* Quiz Grid */}
            {isLoading ? (
              <div className="flex h-64 sm:h-80 items-center justify-center">
                <LoadingWave size="lg" />
              </div>
            ) : quizzes.length === 0 ? (
              <motion.div
                className="flex h-64 sm:h-80 flex-col items-center justify-center gap-3 text-base sm:text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ArchiveX className="h-8 w-8 sm:h-10 sm:w-10" />
                <span>No quizzes found</span>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                // Re-key per query: framer-motion only propagates "hidden" → "visible" when
                // the container (re)mounts. Without this, swapping in cached results (e.g.
                // rapidly toggling filters) mounts the new cards in the "hidden" variant and
                // leaves them permanently invisible.
                key={`${debouncedSearch}|${selectionKey}|${sortBy}|${pageNumber}`}
                // auto-rows-fr + h-full wrappers stretch every card to its
                // row's height, so cards with short titles/descriptions don't
                // end up shorter than their neighbours.
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-fr"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {quizzes.map((quiz) => (
                  <motion.div
                    key={quiz.id}
                    variants={itemVariants}
                    layout={false}
                    className="h-full"
                  >
                    <QuizCard quiz={quiz} onClick={handleQuizClick} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Pagination */}
            <PaginationControls
              pagination={pagination}
              onPageChange={(newPage) => {
                setPageNumber(newPage);
                window.scrollTo(0, 0);
              }}
            />
          </div>
        </div>
      </div>

      {isOpen && selectedQuiz && (
        <QuizStartModal
          quiz={selectedQuiz as QuizSummaryDTO}
          isOpen={isOpen}
          onClose={handleCloseModal}
          onStartQuiz={handleStartQuiz}
        />
      )}
    </div>
  );
}
