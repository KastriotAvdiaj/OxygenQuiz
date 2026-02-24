import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../../quiz-session-types";

interface MultipleChoiceQuestionProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  instantFeedback?: boolean;
  answerResult?: InstantFeedbackAnswerResult | null;
  isTimedOut?: boolean;
  onSelectionChange?: (optionId: number | null, textAnswer?: string) => void;
}

export function MultipleChoiceQuestion({
  question,
  onSubmit,
  isSubmitting,
  instantFeedback = false,
  answerResult = null,
  isTimedOut = false,
  onSelectionChange,
}: MultipleChoiceQuestionProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  // Sync selection to parent ref
  useEffect(() => {
    onSelectionChange?.(selectedOptionId);
  }, [selectedOptionId, onSelectionChange]);

  const handleOptionClick = (optionId: number) => {
    if (isTimedOut) return;

    if (selectedOptionId === optionId) {
      // Double-click: lock in and submit
      onSubmit(optionId);
    } else {
      setSelectedOptionId(optionId);
    }
  };

  const getFeedbackState = (optionId: number) => {
    if (!instantFeedback || !answerResult) return "default";

    if (optionId === answerResult.correctOptionId) {
      return "correct";
    } else if (
      selectedOptionId === optionId &&
      answerResult.status !== "Correct"
    ) {
      return "incorrect";
    }
    return "default";
  };

  const isAnswered = instantFeedback && !!answerResult;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {question.options.map((option, index) => {
          const feedbackState = getFeedbackState(option.id);
          const isSelected = selectedOptionId === option.id;
          const isDisabled = isAnswered || isTimedOut;

          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: isDisabled ? 1 : 1.02 }}
              whileTap={{ scale: isDisabled ? 1 : 0.98 }}>
              <button
                onClick={() => !isDisabled && handleOptionClick(option.id)}
                disabled={isDisabled}
                className={`
                  w-full p-3 sm:p-4 rounded-xl border-2 transition-all duration-300
                  flex items-center gap-3 sm:gap-4 text-left group
                  ${
                    isSelected && !answerResult
                      ? "shadow-lg transform scale-[1.02]"
                      : ""
                  }
                  ${
                    feedbackState === "correct"
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : ""
                  }
                  ${
                    feedbackState === "incorrect"
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : ""
                  }
                  ${
                    feedbackState === "default" && isSelected
                      ? `bg-opacity-10`
                      : ""
                  }
                  ${
                    feedbackState === "default" && !isSelected
                      ? "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                      : ""
                  }
                `}
                style={{
                  borderColor:
                    feedbackState === "correct"
                      ? "#10b981"
                      : feedbackState === "incorrect"
                      ? "#ef4444"
                      : isSelected
                      ? "#2540d9"
                      : undefined,
                  backgroundColor:
                    feedbackState === "correct"
                      ? "#10b98115"
                      : feedbackState === "incorrect"
                      ? "#ef444415"
                      : isSelected
                      ? "#2540d915"
                      : undefined,
                }}>
                {/* Option indicator */}
                <div
                  className={`
                    w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center
                    transition-all duration-200 shrink-0
                  `}
                  style={{
                    borderColor:
                      feedbackState === "correct"
                        ? "#10b981"
                        : feedbackState === "incorrect"
                        ? "#ef4444"
                        : isSelected
                        ? "#2540d9"
                        : "#d1d5db",
                    backgroundColor:
                      feedbackState === "correct"
                        ? "#10b981"
                        : feedbackState === "incorrect"
                        ? "#ef4444"
                        : isSelected
                        ? "#2540d9"
                        : "transparent",
                  }}>
                  {feedbackState === "correct" ? (
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  ) : feedbackState === "incorrect" ? (
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  ) : isSelected ? (
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" />
                  ) : (
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>

                {/* Option text */}
                <span
                  className={`
                    text-base sm:text-lg font-medium flex-1 transition-colors
                    ${
                      feedbackState === "correct"
                        ? "text-green-700 dark:text-green-300"
                        : ""
                    }
                    ${
                      feedbackState === "incorrect"
                        ? "text-red-700 dark:text-red-300"
                        : ""
                    }
                    ${
                      feedbackState === "default"
                        ? "text-gray-900 dark:text-gray-100"
                        : ""
                    }
                  `}>
                  {option.text}
                </span>

                {/* Feedback icons */}
                {instantFeedback && answerResult && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="shrink-0">
                    {feedbackState === "correct" && (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    )}
                    {feedbackState === "incorrect" && (
                      <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                    )}
                  </motion.div>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Submit button + hint */}
      {(!instantFeedback || !answerResult) && !isTimedOut && (
        <motion.div
          className="flex flex-col items-center gap-2 pt-2 sm:pt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}>
          <Button
            onClick={() => onSubmit(selectedOptionId)}
            disabled={selectedOptionId === null || isSubmitting}
            size="lg"
            variant={"fancy"}
            className="px-6 py-4 sm:px-8 sm:py-6 text-lg sm:text-2xl font-secondary font-semibold min-w-[160px] sm:min-w-[200px] bg-primary text-white">
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </div>
            ) : (
              "Submit"
            )}
          </Button>
          {selectedOptionId !== null && (
            <p className="text-xs text-muted-foreground animate-in fade-in duration-300">
              Click the same option again to lock in
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
