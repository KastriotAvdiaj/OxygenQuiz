import { useState } from "react";
import { QuizCard } from "./components/quiz-card";
import { QuizHeader } from "./components/quiz-header";
import { QuizFilters } from "./components/quiz-filters";
import { motion } from "framer-motion";
import { useCategoriedQuizzesData } from "./api/get-categorized-quizzes";
import { ArchiveX } from "lucide-react";


export function QuizSelection() {
  const [searchQuery, setSearchQuery] = useState("");
  const quizzes = useCategoriedQuizzesData({}).data || [];


  return (
    <div className="min-h-screen bg-gradient-to-b from-background overflow-y-auto to-background/80 pb-20 text-foreground">
      <QuizHeader />

      <div className="container mx-auto px-4">
        <QuizFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        {quizzes.length === 0 && (
          <div className="flex items-center flex-col justify-center text-lg text-primary w-full">
            No quizzes found
            <ArchiveX />
          </div>
        )}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <QuizCard quiz={quiz} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
