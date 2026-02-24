import { useState, useMemo, useCallback } from "react";
import { QuizCard } from "./components/quiz-card";
import { QuizToolbar, type SortOption } from "./components/quiz-header";
import { motion } from "framer-motion";
import { ArchiveX, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QuizStartModal } from "./components/quiz-start-modal";
import { QuizSummaryDTO } from "@/types/quiz-types";
import { useDisclosure } from "@/hooks/use-disclosure";
import { usePublicQuizzesData } from "../Dashboard/Pages/Quiz/api/get-public-quizzes";

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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedQuiz, setSelectedQuiz] = useState<QuizSummaryDTO | null>(null);
  const { close, open, isOpen } = useDisclosure();

  const { data: quizzesResponse } = usePublicQuizzesData({
    params: {
      searchTerm: searchQuery || undefined,
    },
  });

  const allQuizzes = useMemo(
    () => quizzesResponse?.data || [],
    [quizzesResponse?.data]
  );

  // Extract unique categories from quizzes
  const categories = useMemo(() => {
    const cats = new Set(allQuizzes.map((q) => q.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [allQuizzes]);

  // Filter by category (client-side)
  const filteredQuizzes = useMemo(() => {
    let filtered = allQuizzes;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((q) => q.category === selectedCategory);
    }

    return filtered;
  }, [allQuizzes, selectedCategory]);

  // Sort
  const sortedQuizzes = useMemo(() => {
    const sorted = [...filteredQuizzes];

    switch (sortBy) {
      case "newest":
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "alphabetical":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "most-questions":
        sorted.sort((a, b) => b.questionCount - a.questionCount);
        break;
    }

    return sorted;
  }, [filteredQuizzes, sortBy]);

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
    <div className="relative text-foreground bg-cover bg-center tracking-wider h-full">
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
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            sortBy={sortBy}
            onSortChange={setSortBy}
            categories={categories}
            resultCount={sortedQuizzes.length}
          />
        </div>

        {/* Quiz Grid */}
        {sortedQuizzes.length === 0 ? (
          <motion.div
            className="flex h-64 sm:h-80 flex-col items-center justify-center gap-3 text-base sm:text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArchiveX className="h-8 w-8 sm:h-10 sm:w-10" />
            <span>No quizzes found</span>
            {(searchQuery || selectedCategory !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
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
            {sortedQuizzes.map((quiz) => (
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
