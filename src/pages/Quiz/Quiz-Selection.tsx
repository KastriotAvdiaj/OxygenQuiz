import { useState, useMemo, useCallback } from "react";
import { QuizCard } from "./components/quiz-card";
import { QuizHeader } from "./components/quiz-header";
import { motion } from "framer-motion";
import { ArchiveX } from "lucide-react";
import {
  // getAllQuizzesQueryOptions,
  useAllQuizzesData,
} from "../Dashboard/Pages/Quiz/api/get-all-quizzes";
import { useNavigate } from "react-router";
// import { QueryClient } from "@tanstack/react-query";
import { QuizStartModal } from "./components/quiz-start-modal";
import { QuizSummaryDTO } from "@/types/quiz-types";
import { useDisclosure } from "@/hooks/use-disclosure";
import { Card } from "@/components/ui";

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
  const [searchQuery] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<QuizSummaryDTO | null>(null);
  const [selectedMode, setSelectedMode] = useState<
    "single" | "multiplayer" | null
  >(null);
  const { close, open, isOpen } = useDisclosure();

  const { data: quizzesResponse } = useAllQuizzesData({
    params: {
      searchTerm: searchQuery,
    },
  });

  const quizzes = useMemo(
    () => quizzesResponse?.data || [],
    [quizzesResponse?.data]
  );

  const handleQuizClick = useCallback((quiz: QuizSummaryDTO) => {
    setSelectedQuiz(quiz);
    open();
  }, []);

  const handleCloseModal = useCallback(() => {
    close();
    setSelectedQuiz(null);
  }, []);

  const navigate = useNavigate();

  const handleStartQuiz = useCallback(
    (quizId: number) => {
      close();
      if (selectedMode === "multiplayer") {
        navigate(`/quiz/${quizId}/multiplayer`);
      } else {
        navigate(`/quiz/${quizId}/play`);
      }
    },
    [navigate, close, selectedMode]
  );
  return (
    <div className="relative min-h-screen pb-20 text-foreground bg-cover bg-center  font-header">
      <QuizHeader />

      <div className="container relative mx-auto p-4">
        {/* Mode Selection or Quiz List */}
        {!selectedMode ? (
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center min-h-[50vh]">
            <Card
              variant="lifted"
              className="text-center space-y-4 cursor-pointer p-4 bg-primary"
              onClick={() => setSelectedMode("single")}>
              <h2 className="text-3xl font-bold text-white font-quiz tracking-wider">
                Single Player
              </h2>
              <p className="text-white">
                Challenge yourself and test your knowledge on your own time.
              </p>
            </Card>
            <Card
              variant="lifted"
              className="text-center space-y-4 cursor-pointer p-4"
              onClick={() => setSelectedMode("multiplayer")}>
              <h2 className="text-3xl font-bold text-primary font-quiz tracking-wider">
                Multiplayer
              </h2>
              <p className="text-muted-foreground">
                Host a game and compete with friends in real-time.
              </p>
            </Card>
          </div>
        ) : (
          /* Quiz List View */
          <>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setSelectedMode(null)}
                className="text-sm font-medium hover:underline text-muted-foreground flex items-center gap-1">
                ← Back to Mode Selection
              </button>
              <h2 className="text-2xl font-bold">
                {selectedMode === "multiplayer"
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
              className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
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
          </>
        )}
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
