import { useState, useCallback, useEffect } from "react";
import { QuizCard } from "./components/quiz-card";
import { QuizToolbar, ALL_FILTER, SORT_RULES, type SortOption } from "./components/quiz-header";
import { motion } from "framer-motion";
import { ArchiveX, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QuizStartModal } from "./components/quiz-start-modal";
import { QuizSummaryDTO } from "@/types/quiz-types";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchQuizzes } from "../Dashboard/Pages/Quiz/api/search-quizzes";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import { PaginationControls } from "@/pages/Dashboard/Pages/Question/Components/Re-Usable-Components/pagination-control";
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

export function QuizSelection() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "single";
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState(ALL_FILTER);
  const [difficultyId, setDifficultyId] = useState(ALL_FILTER);
  const [languageId, setLanguageId] = useState(ALL_FILTER);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
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

  // Reset to the first page whenever the filter/search/sort criteria change.
  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch, categoryId, difficultyId, languageId, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryId(ALL_FILTER);
    setDifficultyId(ALL_FILTER);
    setLanguageId(ALL_FILTER);
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
      if (mode === "multiplayer") {
        navigate(`/quiz/${quizId}/multiplayer`);
      } else {
        navigate(`/quiz/${quizId}/play`);
      }
    },
    [navigate, close, mode]
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
            {mode === "multiplayer"
              ? "Select a Quiz to Host"
              : "Select a Quiz to Play"}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {mode === "multiplayer"
              ? "Choose a quiz to start a multiplayer session with friends."
              : "Browse and pick a quiz to test your knowledge."}
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-5 sm:mb-6 md:mb-8 p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/50">
          <QuizToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={categories}
            selectedCategoryId={categoryId}
            onCategoryChange={setCategoryId}
            difficulties={difficulties}
            selectedDifficultyId={difficultyId}
            onDifficultyChange={setDifficultyId}
            languages={languages}
            selectedLanguageId={languageId}
            onLanguageChange={setLanguageId}
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultCount={pagination?.totalItems ?? quizzes.length}
          />
        </div>

        {/* Quiz Grid */}
        {!isLoading && quizzes.length === 0 ? (
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
          mode={mode}
        />
      )}
    </div>
  );
}
