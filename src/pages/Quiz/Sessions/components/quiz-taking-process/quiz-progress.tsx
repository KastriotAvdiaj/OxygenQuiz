// src/components/quiz/QuizProgress.tsx

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import {
  InstantFeedbackAnswerResult,
  AnswerStatus,
} from "../../quiz-session-types";

interface QuizProgressProps {
  current: number;
  total: number;
  completedAnswers?: InstantFeedbackAnswerResult[];
  showInstantFeedback?: boolean; // NEW: Control whether to show answer feedback
}

export function QuizProgress({
  current,
  total,
  completedAnswers = [],
  showInstantFeedback = false, // Default to false for safety
}: QuizProgressProps) {
  const progressPercentage = (current / total) * 100;

  const getQuestionStatus = (
    questionIndex: number
  ): "correct" | "incorrect" | "current" | "completed" | "upcoming" => {
    const questionNumber = questionIndex + 1;

    if (questionNumber < current) {
      if (!showInstantFeedback) {
        return "completed";
      }

      // For instant feedback quizzes, show the actual result
      const result = completedAnswers[questionIndex];
      if (result) {
        return result.status === AnswerStatus.Correct ? "correct" : "incorrect";
      }
      return "completed"; // Fallback if no result found
    }

    return questionNumber === current ? "current" : "upcoming";
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case "correct":
        return {
          bg: "bg-green-500",
          border: "border-green-500",
          icon: <Check className="w-2 h-2 text-white" />,
        };
      case "incorrect":
        return {
          bg: "bg-red-500",
          border: "border-red-500",
          icon: <X className="w-2 h-2 text-white" />,
        };
      case "completed":
        return {
          bg: "bg-primary",
          border: "border-primary",
          icon: null, // Show question number, not an icon
        };
      case "current":
        return {
          bg: "bg-quiz-primary",
          border:
            "border-quiz-primary ring-2 ring-quiz-primary ring-opacity-30",
          icon: null,
        };
      default:
        return {
          bg: "bg-quiz-border-subtle",
          border: "border-quiz-border",
          icon: null,
        };
    }
  };

  const getStatusLabel = (status: string, questionNumber: number) => {
    switch (status) {
      case "correct":
        return `Question ${questionNumber}: Correct answer`;
      case "incorrect":
        return `Question ${questionNumber}: Incorrect answer`;
      case "completed":
        return `Question ${questionNumber}: Completed`;
      case "current":
        return `Question ${questionNumber}: Current question`;
      default:
        return `Question ${questionNumber}: Upcoming question`;
    }
  };

  // Calculate metrics for display
  const totalScore = showInstantFeedback
    ? completedAnswers.reduce(
        (sum, result) => sum + (result?.scoreAwarded || 0),
        0
      )
    : 0;
  const correctAnswers = showInstantFeedback
    ? completedAnswers.filter(
        (result) => result?.status === AnswerStatus.Correct
      ).length
    : 0;

  return (
    <div className="quiz-card p-4 space-y-4">
      {/* Progress text and metrics */}
      <div className="flex justify-between items-center">
        <span className="quiz-text-primary font-medium">
          Question {current} of {total}
        </span>
        <div className="flex items-center gap-4">
          {showInstantFeedback && completedAnswers.length > 0 && (
            <span className="quiz-text-secondary text-sm">
              {correctAnswers}/{completedAnswers.length} correct
            </span>
          )}
          <span className="quiz-text-secondary text-sm">
            {Math.round(progressPercentage)}% Complete
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="quiz-progress-bar">
        <motion.div
          className="quiz-progress-fill bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Question dots indicator with appropriate status display */}
      <div className="flex justify-center gap-2 flex-wrap">
        {Array.from({ length: total }, (_, index) => {
          const questionNumber = index + 1;
          const status = getQuestionStatus(index);
          const colors = getStatusColors(status);

          return (
            <motion.div
              key={index}
              className={`
                relative w-8 h-8 rounded-full border-2 transition-all duration-300 
                flex items-center justify-center cursor-default
                ${colors.bg} ${colors.border}
              `}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
              title={getStatusLabel(status, questionNumber)}
            >
              {/* Show icon for instant feedback correct/incorrect, otherwise show question number */}
              {colors.icon ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {colors.icon}
                </motion.div>
              ) : (
                <span
                  className={`text-xs font-medium ${
                    status === "current" ||
                    status === "completed" ||
                    status === "correct" ||
                    status === "incorrect"
                      ? "text-white"
                      : "text-quiz-text-secondary"
                  }`}
                >
                  {questionNumber}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Score display (only for instant feedback quizzes) */}
      {showInstantFeedback && totalScore > 0 && (
        <div className="text-center pt-2 border-t border-quiz-border-subtle">
          <span className="quiz-text-secondary text-sm font-medium">
            Total Score: {totalScore} points
          </span>
        </div>
      )}
    </div>
  );
}
