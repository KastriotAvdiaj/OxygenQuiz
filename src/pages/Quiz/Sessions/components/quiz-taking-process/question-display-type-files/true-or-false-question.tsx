import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../../../../../types/quiz-session-types";
import { QuizSubmitButton } from "../quiz-submit-button";

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

    if (selectedOptionId === optionId) {
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
    isTrue: boolean,
    animDelay: number,
    animX: number,
  ) => {
    const feedback = getFeedbackState(option);
    const isSelected = selectedOptionId === option.id;
    // Neutral by default — True/False are distinguished by their icon + label, not by colour.
    // Green/red is reserved for post-answer feedback (correct/incorrect) below.
    const defaultColor = "hsl(var(--muted-foreground))";

    return (
      <motion.div
        initial={{ opacity: 0, x: animX }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: animDelay }}
        whileHover={{ scale: isDisabled ? 1 : 1.03 }}
        whileTap={{ scale: isDisabled ? 1 : 0.97 }}
      >
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
                ? "border-border hover:border-primary/40 bg-card text-foreground"
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
                    ? "hsl(var(--primary))"
                    : undefined,
            backgroundColor:
              feedback === "correct"
                ? "#10b98115"
                : feedback === "incorrect"
                  ? "#ef444415"
                  : isSelected
                    ? "hsl(var(--primary) / 0.1)"
                    : undefined,
            borderWidth: "3px",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor:
                  feedback === "correct"
                    ? "#10b981"
                    : isSelected
                      ? "hsl(var(--primary))"
                      : defaultColor,
              }}
            >
              {isTrue ? (
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </div>
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
      <div className="grid grid-cols-2 gap-2.5 sm:gap-6 max-w-2xl mx-auto">
        {/* True Option */}
        {trueOption && renderOption(trueOption, true, 0.1, -20)}

        {/* False Option */}
        {falseOption && renderOption(falseOption, false, 0.2, 20)}
      </div>

      {/* Submit button (shared across all question types) */}
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
    </div>
  );
}
