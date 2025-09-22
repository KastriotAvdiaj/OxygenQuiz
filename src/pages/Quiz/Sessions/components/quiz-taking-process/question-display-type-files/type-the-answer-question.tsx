import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { CheckCircle, XCircle } from "lucide-react";
import type { InstantFeedbackAnswerResult } from "../../../quiz-session-types";

interface TypeTheAnswerQuestionProps {
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
  instantFeedback?: boolean;
  answerResult?: InstantFeedbackAnswerResult | null;
}

export function TypeTheAnswerQuestion({
  onSubmit,
  isSubmitting,
  theme,
  instantFeedback = false,
  answerResult = null,
}: TypeTheAnswerQuestionProps) {
  const [answer, setAnswer] = useState<string>("");

  const handleSubmit = () => {
    const trimmedAnswer = answer.trim();
    onSubmit(null, trimmedAnswer);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && answer.trim() && !isSubmitting && !answerResult) {
      handleSubmit();
    }
  };

  const isCorrect = answerResult?.status === "Correct";
  const isDisabled = instantFeedback && !!answerResult;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-lg relative"
        >
          <Input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer here..."
            className={`
              h-16 text-xl text-center border-3 rounded-xl transition-all duration-300
              ${isDisabled ? "cursor-not-allowed" : ""}
              ${
                instantFeedback && answerResult
                  ? isCorrect
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                  : ""
              }
            `}
            style={{
              borderColor:
                instantFeedback && answerResult
                  ? isCorrect
                    ? "#10b981"
                    : "#ef4444"
                  : answer.trim()
                  ? theme.primary
                  : undefined,
              backgroundColor:
                instantFeedback && answerResult
                  ? isCorrect
                    ? "#10b98115"
                    : "#ef444415"
                  : undefined,
              borderWidth: "3px",
            }}
            disabled={isDisabled}
            autoFocus={!isDisabled}
          />

          {/* Feedback icon inside input */}
          {instantFeedback && answerResult && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {isCorrect ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Show correct answer if incorrect */}
        {instantFeedback &&
          answerResult &&
          !isCorrect &&
          answerResult.correctAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Correct answer:
              </p>
              <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                {answerResult.correctAnswer}
              </p>
            </motion.div>
          )}

        {!answerResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-500 text-center"
          >
            Press Enter or click Submit to answer
          </motion.div>
        )}
      </div>

      <motion.div
        className="flex justify-center pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Only show button if not answered */}
        {!instantFeedback || !answerResult ? (
          <Button
            onClick={handleSubmit}
            disabled={!answer.trim() || isSubmitting || isDisabled}
            size="lg"
            variant={"fancy"}
            className="px-8 py-3 text-lg font-semibold rounded-xl min-w-[200px]"
            style={{ backgroundColor: theme.primary }}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </div>
            ) : (
              "Submit Answer"
            )}
          </Button>
        ) : null}
      </motion.div>
    </div>
  );
}
