import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../../../../../types/quiz-session-types";
import { QuizSubmitButton } from "../quiz-submit-button";
import {
  ANSWER_SELECTED_BACKGROUND,
  ANSWER_SELECTED_BORDER,
  OPTION_SCALE_TRANSITION,
} from "../answer-colors";

interface TrueOrFalseQuestionProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  instantFeedback?: boolean;
  answerResult?: InstantFeedbackAnswerResult | null;
  isTimedOut?: boolean;
  onSelectionChange?: (optionId: number | null, textAnswer?: string) => void;
  /** First click answers — see the same prop on MultipleChoiceQuestion. */
  submitOnSelect?: boolean;
}

export function TrueOrFalseQuestion({
  question,
  onSubmit,
  isSubmitting,
  instantFeedback = false,
  answerResult = null,
  isTimedOut = false,
  onSelectionChange,
  submitOnSelect = false,
}: TrueOrFalseQuestionProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  // Identify the True / False options by their semantic text, not by hard-coded ids.
  // The backend fabricates exactly two options ("True", "False") for T/F questions
  // (see EntityMappers.ToCurrentQuestionDto); we submit whichever id it gave us.
  const isTrueText = (text: string) => text.trim().toLowerCase() === "true";
  const trueOption =
    question.options.find((opt) => isTrueText(opt.text)) ?? question.options[0];
  const falseOption =
    question.options.find((opt) => !isTrueText(opt.text)) ?? question.options[1];

  // Sync selection to parent ref
  useEffect(() => {
    onSelectionChange?.(selectedOptionId);
  }, [selectedOptionId, onSelectionChange]);

  const handleOptionClick = (optionId: number) => {
    if (isTimedOut) return;

    if (submitOnSelect) {
      setSelectedOptionId(optionId);
      onSubmit(optionId);
    } else if (selectedOptionId === optionId) {
      // Double-click: lock in and submit
      onSubmit(optionId);
    } else {
      setSelectedOptionId(optionId);
    }
  };

  const getFeedbackState = (option: { id: number; text: string }) => {
    if (!instantFeedback || !answerResult) return "default";

    // On a correct submission the backend omits the correct answer, so treat the user's
    // own pick as correct. Otherwise highlight whichever option matches `correctAnswer`
    // ("True"/"False") — the backend does NOT send correctOptionId for T/F questions.
    if (answerResult.status === "Correct") {
      return selectedOptionId === option.id ? "correct" : "default";
    }

    const isThisCorrect =
      answerResult.correctAnswer != null &&
      option.text.trim().toLowerCase() ===
        answerResult.correctAnswer.trim().toLowerCase();

    if (isThisCorrect) return "correct";
    if (selectedOptionId === option.id) return "incorrect";
    return "default";
  };

  const isAnswered = instantFeedback && !!answerResult;
  const isDisabled = isAnswered || isTimedOut;

  const renderOption = (
    option: { id: number; text: string },
    animDelay: number,
    animX: number,
  ) => {
    const feedback = getFeedbackState(option);
    const isSelected = selectedOptionId === option.id;

    return (
      <motion.div
        initial={{ opacity: 0, x: animX }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          opacity: { delay: animDelay },
          x: { delay: animDelay },
          scale: OPTION_SCALE_TRANSITION,
        }}
        whileHover={{ scale: isDisabled ? 1 : 1.03 }}
        whileTap={{ scale: isDisabled ? 1 : 0.97 }}
      >
        <button
          onClick={() => !isDisabled && handleOptionClick(option.id)}
          disabled={isDisabled}
          className={`
            w-full h-14 sm:h-16 md:h-[4.5rem] rounded-xl border-3 transition-all duration-300
            flex items-center justify-center gap-3 text-base sm:text-lg font-semibold
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
                ? // Same surface as the multiple-choice options, so the two question types
                  // don't look like two different games.
                  "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-foreground"
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
                    ? ANSWER_SELECTED_BORDER
                    : undefined,
            backgroundColor:
              feedback === "correct"
                ? "#10b98115"
                : feedback === "incorrect"
                  ? "#ef444415"
                  : isSelected
                    ? ANSWER_SELECTED_BACKGROUND
                    : undefined,
            borderWidth: "3px",
          }}
        >
          <div className="flex items-center gap-3">
            <span>{option.text}</span>
            {instantFeedback && answerResult && feedback !== "default" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-xl font-bold ${
                  feedback === "correct" ? "text-green-600" : "text-red-600"
                }`}
              >
                {feedback === "correct" ? "✓" : "✗"}
              </motion.div>
            )}
          </div>
        </button>
      </motion.div>
    );
  };

  return (
    // Compact base spacing: phones must fit everything in one viewport (docs/RESPONSIVE.md).
    <div className="space-y-3 sm:space-y-6">
      {/* pt on the row, not the shared `space-y`: two big buttons sat almost against the
          question card, which read as one block. Modest on phones — the whole question screen
          still has to fit one viewport (docs/RESPONSIVE.md). */}
      <div className="grid grid-cols-2 gap-2.5 pt-1 sm:gap-6 sm:pt-3 max-w-2xl mx-auto">
        {/* True Option */}
        {trueOption && renderOption(trueOption, 0.1, -20)}

        {/* False Option */}
        {falseOption && renderOption(falseOption, 0.2, 20)}
      </div>

      {/* Submit button (shared across all question types) */}
      {!submitOnSelect && (
      <QuizSubmitButton
        onSubmit={() => onSubmit(selectedOptionId)}
        canSubmit={selectedOptionId !== null}
        isSubmitting={isSubmitting}
        answered={isAnswered}
        isTimedOut={isTimedOut}
        motionDelay={0.3}
        hint={
          selectedOptionId !== null
            ? "Click the same option again to lock in"
            : undefined
        }
      />
      )}
    </div>
  );
}
