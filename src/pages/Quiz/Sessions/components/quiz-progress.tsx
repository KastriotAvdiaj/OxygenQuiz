// src/components/quiz/QuizProgress.tsx

import { motion } from "framer-motion";
import type { QuizThemeConfig } from "@/hooks/use-quiz-theme";

interface QuizProgressProps {
  current: number;
  total: number;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
}

export function QuizProgress({ current, total, theme }: QuizProgressProps) {
  const progressPercentage = (current / total) * 100;

  return (
    <div className="quiz-card p-4 space-y-3">
      {/* Progress text */}
      <div className="flex justify-between items-center">
        <span className="quiz-text-primary font-medium">
          Question {current} of {total}
        </span>
        <span className="quiz-text-secondary text-sm">
          {Math.round(progressPercentage)}% Complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="quiz-progress-bar">
        <motion.div
          className="quiz-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ backgroundColor: theme.primary }}
        />
      </div>

      {/* Question dots indicator */}
      <div className="flex justify-center space-x-2">
        {Array.from({ length: total }, (_, index) => {
          const questionNumber = index + 1;
          const isCompleted = questionNumber < current;
          const isCurrent = questionNumber === current;

          return (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isCompleted
                  ? "bg-quiz-success"
                  : isCurrent
                  ? "bg-quiz-primary ring-2 ring-quiz-primary ring-opacity-30"
                  : "bg-quiz-border-subtle"
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
              style={{
                backgroundColor: isCompleted
                  ? theme.primary
                  : isCurrent
                  ? theme.primary
                  : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
