import { useState, useCallback, useEffect } from "react";
import { QuizCard } from "./components/quiz-card";
import { QuizToolbar, ALL_FILTER, SORT_RULES, DEFAULT_SORT, type SortOption } from "./components/quiz-header";
import { motion } from "framer-motion";
import { ArchiveX, ArrowLeft, ListFilter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuizStartModal } from "./components/quiz-start-modal";
import { QuizSummaryDTO } from "@/types/quiz-types";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchQuizzes } from "../Dashboard/Pages/Quiz/api/search-quizzes";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import { PaginationControls } from "@/components/ui/pagination-control";
import { LoadingWave } from "@/components/ui";
import { useQuestionCategoryData } from "../Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../Dashboard/Pages/Question/Entities/Language/api/get-question-language";

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
// same QuizToolbar. The old ?mode=multiplayer branch here was dead code.
export function QuizSelection() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState(ALL_FILTER);
  const [difficultyId, setDifficultyId] = useState(ALL_FILTER);
  const [languageId, setLanguageId] = useState(ALL_FILTER);
  // Defaults to "variety": the first page interleaves categories so new users see
  // the breadth of quizzes on offer (docs/quiz/quiz-discovery.md).
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizSummaryDTO | null>(null);
  const { close, open, isOpen } = useDisclosure();

  // Debounce search so we don't fire a request on every keystroke.
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Filter option lists (with ids) — the API filters by id, not by name.
  const { data: categories = [] } = useQuestionCategoryData({});
  const { data: difficulties = [] } = useQuestionDifficultyData({});
  const { data: languages = [] } = useQuestionLanguageData({});

  // Build the server-side query: search + filters + sort + paging, all handled by
  // the public quiz catalogue endpoint (/quiz/search, scope "public").
  const filters: FilterRule[] = [];
  if (categoryId !== ALL_FILTER) filters.push(rule.eq("categoryId", Number(categoryId)));
  if (difficultyId !== ALL_FILTER) filters.push(rule.eq("difficultyId", Number(difficultyId)));
  if (languageId !== ALL_FILTER) filters.push(rule.eq("languageId", Number(languageId)));

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

  const hasActiveFilters =
    Boolean(searchQuery) ||
    categoryId !== ALL_FILTER ||
    difficultyId !== ALL_FILTER ||
    languageId !== ALL_FILTER;

  // Dismissible chips shown in the results header — one per active filter.
  const filterChips: { key: string; label: string; onClear: () => void }[] = [];
  if (searchQuery)
    filterChips.push({
      key: "search",
      label: `“${searchQuery}”`,
      onClear: () => setSearchQuery(""),
    });
  if (categoryId !== ALL_FILTER) {
    const name = categories.find((c) => String(c.id) === categoryId)?.name;
    if (name)
      filterChips.push({
        key: "category",
        label: name,
        onClear: () => setCategoryId(ALL_FILTER),
      });
  }
  if (difficultyId !== ALL_FILTER) {
    const level = difficulties.find((d) => String(d.id) === difficultyId)?.level;
    if (level)
      filterChips.push({
        key: "difficulty",
        label: level,
        onClear: () => setDifficultyId(ALL_FILTER),
      });
  }
  if (languageId !== ALL_FILTER) {
    const lang = languages.find((l) => String(l.id) === languageId)?.language;
    if (lang)
      filterChips.push({
        key: "language",
        label: lang,
        onClear: () => setLanguageId(ALL_FILTER),
      });
  }

  const resultCount = pagination?.totalItems ?? quizzes.length;

  // Search is debounced, so its page reset happens when the debounced value lands.
  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch]);

  // Filter/sort changes reset the page in the same render — resetting in an effect
  // fired one render late and briefly queried an out-of-range page.
  const handleCategoryChange = useCallback((v: string) => {
    setCategoryId(v);
    setPageNumber(1);
  }, []);
  const handleDifficultyChange = useCallback((v: string) => {
    setDifficultyId(v);
    setPageNumber(1);
  }, []);
  const handleLanguageChange = useCallback((v: string) => {
    setLanguageId(v);
    setPageNumber(1);
  }, []);
  const handleSortChange = useCallback((v: SortOption) => {
    setSortBy(v);
    setPageNumber(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryId(ALL_FILTER);
    setDifficultyId(ALL_FILTER);
    setLanguageId(ALL_FILTER);
    setPageNumber(1);
  }, []);

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

  return (
    <div className="relative text-foreground bg-cover bg-center tracking-wider h-full bg-muted">
      <div className="container relative mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 md:py-8 pb-8 sm:pb-12 md:pb-16">
        {/* Navigation + Title */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          <button
            onClick={() => navigate("/choose-mode")}
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-2 sm:mb-3 transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Mode Selection</span>
            <span className="sm:hidden">Back</span>
          </button>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Select a Quiz to Play
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Browse and pick a quiz to test your knowledge.
          </p>
        </div>

        {/* Toolbar — no card wrapper: the lifted quiz-variant controls stand on their own */}
        <div className="mb-4 sm:mb-5">
          <QuizToolbar
            showCount={false}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={categories}
            selectedCategoryId={categoryId}
            onCategoryChange={handleCategoryChange}
            difficulties={difficulties}
            selectedDifficultyId={difficultyId}
            onDifficultyChange={handleDifficultyChange}
            languages={languages}
            selectedLanguageId={languageId}
            onLanguageChange={handleLanguageChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            resultCount={pagination?.totalItems ?? quizzes.length}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Results header — visually separates the toolbar from the quiz grid.
            The match-count pill and filter chips only appear while filtering:
            a total is noise when browsing everything, but useful feedback once
            the user has narrowed things down. */}
        <div className="mb-5 sm:mb-6 md:mb-7 flex flex-wrap items-center gap-2 sm:gap-3">
          {hasActiveFilters && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary/40 dark:border-primary/60 bg-background px-3 py-1 text-xs font-header font-semibold text-primary shadow-[0_2px_0_0_hsl(var(--primary)/0.35)] whitespace-nowrap tabular-nums">
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
            key={`${debouncedSearch}|${categoryId}|${difficultyId}|${languageId}|${sortBy}|${pageNumber}`}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:grid-cols-3 xl:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                variants={itemVariants}
                layout={false}
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
