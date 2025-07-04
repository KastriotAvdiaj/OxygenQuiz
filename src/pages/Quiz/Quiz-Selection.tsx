import { useState, useMemo } from "react";
import { QuizCard } from "./components/quiz-card";
import { QuizHeader } from "./components/quiz-header";
import { motion } from "framer-motion";
import { ArchiveX } from "lucide-react";
import {
  getAllQuizzesQueryOptions,
  useAllQuizzesData,
} from "../Dashboard/Pages/Quiz/api/get-all-quizzes";
import { LoaderFunction } from "react-router";
import { QueryClient } from "@tanstack/react-query";

export const quizSelectionLoader =
  (queryClient: QueryClient): LoaderFunction =>
  async () => {
    const initialParams = {};
    const options = getAllQuizzesQueryOptions(initialParams);
    return await queryClient.ensureQueryData(options);
  };

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
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: quizzesResponse,
    isLoading,
    isError,
  } = useAllQuizzesData({
    params: {
      searchTerm: searchQuery,
    },
  });

  // Memoize quizzes to prevent unnecessary re-renders
  const quizzes = useMemo(() => quizzesResponse?.data || [], [quizzesResponse?.data]);

  // Show loading state to prevent layout shift
  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-y-auto pb-20 text-foreground">
        <QuizHeader />
        <div className="container relative mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Skeleton loading cards */}
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="h-[200px] rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-y-auto pb-20 text-foreground">
      <QuizHeader />

      <div className="container relative mx-auto px-4">
        {quizzes.length === 0 && (
          <motion.div
            className="flex h-96 flex-col items-center justify-center gap-4 text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArchiveX className="h-10 w-10" />
            No quizzes found
          </motion.div>
        )}
        
        <motion.div
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {quizzes.map((quiz) => (
            <motion.div
              key={quiz.id}
              variants={itemVariants}
              layout={false} // Disable layout animations
            >
              <QuizCard quiz={quiz} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}