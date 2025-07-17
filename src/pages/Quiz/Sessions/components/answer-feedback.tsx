// src/components/quiz/AnswerFeedback.tsx

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnswerResult, AnswerStatus } from "../quiz-session-types";

interface AnswerFeedbackProps {
  result: AnswerResult;
  onNext: () => void;
}

const feedbackDetails = {
  [AnswerStatus.Correct]: {
    Icon: CheckCircle2,
    text: "Correct!",
    color: "text-green-400",
  },
  [AnswerStatus.Incorrect]: {
    Icon: XCircle,
    text: "Incorrect",
    color: "text-red-400",
  },
  [AnswerStatus.TimedOut]: {
    Icon: XCircle,
    text: "Time's Up!",
    color: "text-yellow-400",
  },
  [AnswerStatus.NotAnswered]: {
    // Fallback
    Icon: XCircle,
    text: "No Answer",
    color: "text-gray-400",
  },
};

export function AnswerFeedback({ result, onNext }: AnswerFeedbackProps) {
  const details =
    feedbackDetails[result.status] ?? feedbackDetails[AnswerStatus.NotAnswered];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center space-y-6 rounded-lg border-2 border-gray-700 bg-gray-900 p-8"
    >
      <details.Icon className={`h-24 w-24 ${details.color}`} />
      <h2 className={`text-4xl font-bold ${details.color}`}>{details.text}</h2>
      <p className="text-xl text-gray-300">
        You earned {result.scoreAwarded} points.
      </p>

      <Button onClick={onNext} size="lg" className="mt-4 text-lg">
        {result.isQuizComplete ? "View Results" : "Next Question"}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </motion.div>
  );
}
