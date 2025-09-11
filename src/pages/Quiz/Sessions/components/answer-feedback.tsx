// src/components/quiz/AnswerFeedback.tsx

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnswerResult, AnswerStatus } from "../quiz-session-types";

interface AnswerFeedbackProps {
  result: AnswerResult;
  onNext: () => void;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
}

const feedbackDetails = {
  [AnswerStatus.Correct]: {
    Icon: CheckCircle2,
    text: "Excellent!",
    color: "text-quiz-success",
    bgColor: "bg-quiz-success",
  },
  [AnswerStatus.Incorrect]: {
    Icon: XCircle,
    text: "Not quite right",
    color: "text-quiz-error",
    bgColor: "bg-quiz-error",
  },
  [AnswerStatus.TimedOut]: {
    Icon: XCircle,
    text: "Time's up!",
    color: "text-quiz-warning",
    bgColor: "bg-quiz-warning",
  },
  [AnswerStatus.NotAnswered]: {
    // Fallback
    Icon: XCircle,
    text: "No answer",
    color: "text-quiz-neutral",
    bgColor: "bg-quiz-neutral",
  },
};

export function AnswerFeedback({ result, onNext, theme }: AnswerFeedbackProps) {
  const details =
    feedbackDetails[result.status] ?? feedbackDetails[AnswerStatus.NotAnswered];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
      }}
      className="quiz-card-elevated p-8 text-center space-y-6 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-5"
        style={{ background: theme.gradients.subtle }}
      />

      {/* Icon with animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        className="relative z-10"
      >
        <details.Icon
          className={`h-20 w-20 mx-auto ${details.color}`}
          style={{
            color:
              result.status === AnswerStatus.Correct
                ? theme.primary
                : undefined,
          }}
        />
      </motion.div>

      {/* Feedback text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3 relative z-10"
      >
        <h2 className={`text-3xl md:text-4xl font-bold quiz-text-primary`}>
          {details.text}
        </h2>

        {/* Score display */}
        <div className="space-y-2">
          <p className="quiz-text-secondary text-lg">You earned</p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="inline-flex items-center justify-center px-4 py-2 rounded-full"
            style={{
              backgroundColor: `${theme.primary}20`,
              border: `2px solid ${theme.primary}40`,
            }}
          >
            <span
              className="text-2xl font-bold"
              style={{ color: theme.primary }}
            >
              {result.scoreAwarded} points
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Action button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 flex items-center justify-center"
      >
        <Button
          onClick={onNext}
          size="lg"
          className="px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-white"
          style={{ backgroundColor: theme.primary }}
        >
          {result.isQuizComplete ? "View Results" : "Next Question"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
