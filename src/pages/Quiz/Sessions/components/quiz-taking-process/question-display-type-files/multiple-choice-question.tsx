import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, ListChecks, CircleDot } from "lucide-react";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../../../../../types/quiz-session-types";
import { QuizSubmitButton } from "../quiz-submit-button";

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
  // Multi-select questions accept more than one correct option.
  const isMulti = !!question.allowMultipleSelections;

  // Unified selection state (single-select simply never holds more than one id).
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Sync selection to parent ref (kept for potential future use).
  useEffect(() => {
    onSelectionChange?.(selectedIds[0] ?? null);
  }, [selectedIds, onSelectionChange]);

  const submitSelection = () => {
    if (isMulti) {
      // Submit the chosen ids as a CSV through the existing submittedAnswer channel.
      onSubmit(null, selectedIds.join(","));
    } else {
      onSubmit(selectedIds[0] ?? null);
    }
  };

  const handleOptionClick = (optionId: number) => {
    if (isTimedOut) return;

    if (isMulti) {
      // Toggle; submit happens via the button.
      setSelectedIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId],
      );
    } else if (selectedIds[0] === optionId) {
      // Double-click on the already-selected option locks it in and submits.
      onSubmit(optionId);
    } else {
      setSelectedIds([optionId]);
    }
  };

  // Correct option ids reported by instant feedback (multi list, or the single id).
  const correctIds =
    answerResult?.correctOptionIds ??
    (answerResult?.correctOptionId != null
      ? [answerResult.correctOptionId]
      : []);

  const getFeedbackState = (
    optionId: number,
  ): "correct" | "incorrect" | "default" => {
    if (!instantFeedback || !answerResult) return "default";

    // On a correct answer the backend omits the correct ids, so treat the user's
    // own selection as correct; otherwise highlight the actual correct option(s).
    if (answerResult.status === "Correct") {
      return selectedIds.includes(optionId) ? "correct" : "default";
    }
    if (correctIds.includes(optionId)) return "correct";
    if (selectedIds.includes(optionId)) return "incorrect";
    return "default";
  };

  const isAnswered = instantFeedback && !!answerResult;
  const indicatorRadius = isMulti ? "rounded-md" : "rounded-full";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Selection-mode indicator — tells the user how many options to pick */}
      <div className="flex justify-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-medium border ${
            isMulti
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-gray-300 dark:border-gray-600 text-muted-foreground"
          }`}
        >
          {isMulti ? (
            <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <CircleDot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
          {isMulti ? "Select all that apply" : "Choose one"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {question.options.map((option, index) => {
          const feedbackState = getFeedbackState(option.id);
          const isSelected = selectedIds.includes(option.id);
          const isDisabled = isAnswered || isTimedOut;

          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: isDisabled ? 1 : 1.02 }}
              whileTap={{ scale: isDisabled ? 1 : 0.98 }}
            >
              <button
                onClick={() => !isDisabled && handleOptionClick(option.id)}
                disabled={isDisabled}
                className={`
                  w-full p-3 sm:p-4 rounded-xl border-2 transition-all duration-300
                  flex items-center gap-3 sm:gap-4 text-left group
                  ${isSelected && !answerResult ? "shadow-lg transform scale-[1.02]" : ""}
                  ${feedbackState === "correct" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : ""}
                  ${feedbackState === "incorrect" ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""}
                  ${feedbackState === "default" && isSelected ? `bg-opacity-10` : ""}
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
                }}
              >
                {/* Option indicator — square (checkbox) for multi-select, round (radio) for single */}
                <div
                  className={`
                    w-5 h-5 sm:w-6 sm:h-6 ${indicatorRadius} border-2 flex items-center justify-center
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
                  }}
                >
                  {feedbackState === "correct" ? (
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  ) : feedbackState === "incorrect" ? (
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  ) : isSelected ? (
                    isMulti ? (
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    ) : (
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" />
                    )
                  ) : (
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>

                {/* Option text */}
                <span
                  className={`
                    text-base sm:text-lg font-medium flex-1 transition-colors
                    ${feedbackState === "correct" ? "text-green-700 dark:text-green-300" : ""}
                    ${feedbackState === "incorrect" ? "text-red-700 dark:text-red-300" : ""}
                    ${feedbackState === "default" ? "text-gray-900 dark:text-gray-100" : ""}
                  `}
                >
                  {option.text}
                </span>

                {/* Feedback icons */}
                {instantFeedback && answerResult && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="shrink-0"
                  >
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

      {/* Submit button + hint (shared across all question types) */}
      <QuizSubmitButton
        onSubmit={submitSelection}
        canSubmit={selectedIds.length > 0}
        isSubmitting={isSubmitting}
        answered={isAnswered}
        isTimedOut={isTimedOut}
        motionDelay={0.4}
        hint={
          selectedIds.length > 0
            ? isMulti
              ? `${selectedIds.length} selected — Submit when you've picked all that apply`
              : "Click the same option again to lock in"
            : undefined
        }
      />
    </div>
  );
}
