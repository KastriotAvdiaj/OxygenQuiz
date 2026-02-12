import { useState, useMemo, useCallback } from "react";
import { QuizCard } from "./components/quiz-card";
import { QuizHeader } from "./components/quiz-header";
import { motion } from "framer-motion";
import { ArchiveX } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
// import { QueryClient } from "@tanstack/react-query";
import { QuizStartModal } from "./components/quiz-start-modal";
import { QuizSummaryDTO } from "@/types/quiz-types";
import { useDisclosure } from "@/hooks/use-disclosure";

import { usePublicQuizzesData } from "../Dashboard/Pages/Quiz/api/get-public-quizzes";

// export const quizSelectionLoader =
//   (queryClient: QueryClient): LoaderFunction =>
//   async () => {
//     const initialParams = {};
//     const options = getAllQuizzesQueryOptions(initialParams);
//     return await queryClient.ensureQueryData(options);
//   };

// Optimized container animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.05, // Reduced stagger for faster loading
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
  const mode = searchParams.get("mode") || "single"; // Default to single if not specified
  
  const [searchQuery] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<QuizSummaryDTO | null>(null);
  const { close, open, isOpen } = useDisclosure();

  const { data: quizzesResponse } = usePublicQuizzesData({
    params: {
      searchTerm: searchQuery,
    },
  });

  const quizzes = useMemo(
    () => quizzesResponse?.data || [],
    [quizzesResponse?.data],
  );

  const handleQuizClick = useCallback((quiz: QuizSummaryDTO) => {
    setSelectedQuiz(quiz);
    open();
  }, [open]);

  const handleCloseModal = useCallback(() => {
    close();
    setSelectedQuiz(null);
  }, [close]);

  const navigate = useNavigate();

  const handleStartQuiz = useCallback(
    (quizId: number) => {
      close();
      if (mode === "multiplayer") {
        navigate(`/quiz/${quizId}/multiplayer`); // Ensure this route exists or is handled
      } else {
        navigate(`/quiz/${quizId}/play`);
      }
    },
    [navigate, close, mode],
  );

  return (
    <div className="relative pb-6 sm:pb-12 md:pb-20 text-foreground bg-cover bg-center tracking-wider">
      <QuizHeader />

      <div className="container relative mx-auto p-4">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate("/choose-mode")}
              className="text-sm font-medium hover:underline text-muted-foreground flex items-center gap-1">
              ← Back to Mode Selection
            </button>
            <h2 className="text-2xl font-bold">
              {mode === "multiplayer"
                ? "Select a Quiz to Host"
                : "Select a Quiz to Play"}
            </h2>
          </div>

          {quizzes.length === 0 && (
            <motion.div
              className="flex h-96 flex-col items-center justify-center gap-4 text-lg text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}>
              <ArchiveX className="h-10 w-10" />
              No quizzes found
            </motion.div>
          )}

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible">
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                variants={itemVariants}
                layout={false}>
                <QuizCard quiz={quiz} onClick={handleQuizClick} />
              </motion.div>
            ))}
          </motion.div>
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
