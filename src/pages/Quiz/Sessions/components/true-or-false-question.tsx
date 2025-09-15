// src/pages/Quiz/Sessions/components/true-or-false-question.tsx

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { CurrentQuestion, AnswerResult } from "../quiz-session-types";

interface TrueOrFalseQuestionProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
  instantFeedback?: boolean;
  answerResult?: AnswerResult | null;
  selectedOptionId: number | null;
  setSelectedOptionId: (id: number | null) => void;
}

export function TrueOrFalseQuestion({
  question,
  onSubmit,
  isSubmitting,
  theme,
  instantFeedback = false,
  answerResult = null,
  selectedOptionId,
  setSelectedOptionId,
}: TrueOrFalseQuestionProps) {
  // True/False questions have specific option IDs: 1 for True, 0 for False
  const trueOption = { id: 1, text: "True" };
  const falseOption = { id: 0, text: "False" };

  // Helper function to determine feedback state for an option
  const getFeedbackState = (optionId: number) => {
    if (!instantFeedback || !answerResult) return "default";

    if (optionId === answerResult.correctAnswerId) {
      return "correct"; // This is the correct answer
    } else if (
      selectedOptionId === optionId &&
      answerResult.status !== "Correct"
    ) {
      return "incorrect"; // This was the user's wrong selection
    }
    return "default";
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* True Button */}
        <motion.div
          whileHover={{ scale: instantFeedback && answerResult ? 1 : 1.03 }}
          whileTap={{ scale: instantFeedback && answerResult ? 1 : 0.98 }}
        >
          <button
            onClick={() => !answerResult && setSelectedOptionId(trueOption.id)}
            disabled={instantFeedback && !!answerResult}
            className={`quiz-answer-option w-full text-center text-xl font-semibold p-6 transition-all duration-300 ${
              selectedOptionId === trueOption.id ? "selected" : ""
            } ${
              getFeedbackState(trueOption.id) === "correct"
                ? "border-green-500 bg-green-100 dark:bg-green-900"
                : getFeedbackState(trueOption.id) === "incorrect"
                ? "border-red-500 bg-red-100 dark:bg-red-900"
                : ""
            }`}
            style={{
              borderColor:
                getFeedbackState(trueOption.id) === "correct"
                  ? "#10b981"
                  : getFeedbackState(trueOption.id) === "incorrect"
                  ? "#ef4444"
                  : selectedOptionId === trueOption.id
                  ? theme.primary
                  : undefined,
              backgroundColor:
                getFeedbackState(trueOption.id) === "correct"
                  ? "#10b98115"
                  : getFeedbackState(trueOption.id) === "incorrect"
                  ? "#ef444415"
                  : selectedOptionId === trueOption.id
                  ? `${theme.primary}15`
                  : undefined,
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>✓ {trueOption.text}</span>
              {instantFeedback && answerResult && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`text-xl font-bold ${
                    getFeedbackState(trueOption.id) === "correct"
                      ? "text-green-600"
                      : getFeedbackState(trueOption.id) === "incorrect"
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {getFeedbackState(trueOption.id) === "correct"
                    ? "✓"
                    : getFeedbackState(trueOption.id) === "incorrect"
                    ? "✗"
                    : ""}
                </motion.div>
              )}
            </div>
          </button>
        </motion.div>

        {/* False Button */}
        <motion.div
          whileHover={{ scale: instantFeedback && answerResult ? 1 : 1.03 }}
          whileTap={{ scale: instantFeedback && answerResult ? 1 : 0.98 }}
        >
          <button
            onClick={() => !answerResult && setSelectedOptionId(falseOption.id)}
            disabled={instantFeedback && !!answerResult}
            className={`quiz-answer-option w-full text-center text-xl font-semibold p-6 transition-all duration-300 ${
              selectedOptionId === falseOption.id ? "selected" : ""
            } ${
              getFeedbackState(falseOption.id) === "correct"
                ? "border-green-500 bg-green-100 dark:bg-green-900"
                : getFeedbackState(falseOption.id) === "incorrect"
                ? "border-red-500 bg-red-100 dark:bg-red-900"
                : ""
            }`}
            style={{
              borderColor:
                getFeedbackState(falseOption.id) === "correct"
                  ? "#10b981"
                  : getFeedbackState(falseOption.id) === "incorrect"
                  ? "#ef4444"
                  : selectedOptionId === falseOption.id
                  ? theme.primary
                  : undefined,
              backgroundColor:
                getFeedbackState(falseOption.id) === "correct"
                  ? "#10b98115"
                  : getFeedbackState(falseOption.id) === "incorrect"
                  ? "#ef444415"
                  : selectedOptionId === falseOption.id
                  ? `${theme.primary}15`
                  : undefined,
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>✗ {falseOption.text}</span>
              {instantFeedback && answerResult && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`text-xl font-bold ${
                    getFeedbackState(falseOption.id) === "correct"
                      ? "text-green-600"
                      : getFeedbackState(falseOption.id) === "incorrect"
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {getFeedbackState(falseOption.id) === "correct"
                    ? "✓"
                    : getFeedbackState(falseOption.id) === "incorrect"
                    ? "✗"
                    : ""}
                </motion.div>
              )}
            </div>
          </button>
        </motion.div>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={() => onSubmit(selectedOptionId)}
          disabled={
            selectedOptionId === null ||
            isSubmitting ||
            (instantFeedback && !!answerResult)
          }
          size="lg"
          className="w-full max-w-xs text-xl"
          style={{ backgroundColor: theme.primary }}
        >
          {isSubmitting
            ? "Submitting..."
            : instantFeedback && answerResult
            ? "Answer Submitted"
            : "Submit Answer"}
        </Button>
      </div>
    </div>
  );
}
