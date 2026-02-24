import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../../quiz-session-types";

interface TrueOrFalseQuestionProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  instantFeedback?: boolean;
  answerResult?: InstantFeedbackAnswerResult | null;
  isTimedOut?: boolean;
  onSelectionChange?: (optionId: number | null, textAnswer?: string) => void;
}

export function TrueOrFalseQuestion({
  question,
  onSubmit,
  isSubmitting,
  instantFeedback = false,
  answerResult = null,
  isTimedOut = false,
  onSelectionChange,
}: TrueOrFalseQuestionProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  // Find the True and False options from the question options
  const trueOption = question.options.find((opt) => opt.id === 1);
  const falseOption = question.options.find((opt) => opt.id === 2);

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
  const isDisabled = isAnswered || isTimedOut;

  const renderOption = (
    option: { id: number; text: string },
    isTrue: boolean,
    animDelay: number,
    animX: number
  ) => {
    const feedback = getFeedbackState(option.id);
    const isSelected = selectedOptionId === option.id;
    const defaultColor = isTrue ? "#22c55e" : "#ef4444";

    return (
      <motion.div
        initial={{ opacity: 0, x: animX }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: animDelay }}
        whileHover={{ scale: isDisabled ? 1 : 1.03 }}
        whileTap={{ scale: isDisabled ? 1 : 0.97 }}>
        <button
          onClick={() => !isDisabled && handleOptionClick(option.id)}
          disabled={isDisabled}
          className={`
            w-full h-16 sm:h-20 md:h-24 rounded-xl border-3 transition-all duration-300
            flex items-center justify-center gap-3 text-lg sm:text-xl font-semibold
            ${
              feedback === "correct"
                ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : ""
            }
            ${
              feedback === "incorrect"
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                : ""
            }
            ${
              feedback === "default" && isSelected
                ? "shadow-lg transform scale-105"
                : ""
            }
            ${
              feedback === "default" && !isSelected
                ? "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                : ""
            }
          `}
          style={{
            borderColor:
              feedback === "correct"
                ? "#10b981"
                : feedback === "incorrect"
                ? "#ef4444"
                : isSelected
                ? "#2540d9"
                : undefined,
            backgroundColor:
              feedback === "correct"
                ? "#10b98115"
                : feedback === "incorrect"
                ? "#ef444415"
                : isSelected
                ? "#2540d915"
                : undefined,
            borderWidth: "3px",
          }}>
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor:
                  feedback === "correct"
                    ? "#10b981"
                    : isSelected
                    ? "#2540d9"
                    : defaultColor,
              }}>
              {isTrue ? (
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </div>
            <span>{isTrue ? "True" : "False"}</span>
            {instantFeedback &&
              answerResult &&
              feedback !== "default" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`text-xl font-bold ${
                    feedback === "correct"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                  {feedback === "correct" ? "✓" : "✗"}
                </motion.div>
              )}
          </div>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
        {/* True Option */}
        {trueOption && renderOption(trueOption, true, 0.1, -20)}

        {/* False Option */}
        {falseOption && renderOption(falseOption, false, 0.2, 20)}
      </div>

      {/* Submit button */}
      {(!instantFeedback || !answerResult) && !isTimedOut && (
        <motion.div
          className="flex flex-col items-center gap-2 pt-2 sm:pt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}>
          <Button
            onClick={() => onSubmit(selectedOptionId)}
            disabled={selectedOptionId === null || isSubmitting || isDisabled}
            size="lg"
            variant={"fancy"}
            className="px-6 py-4 sm:px-8 sm:py-6 text-lg sm:text-2xl font-semibold font-secondary rounded-xl min-w-[160px] sm:min-w-[200px] bg-primary text-white">
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
