import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import type { InstantFeedbackAnswerResult } from "../../quiz-session-types";

interface FeedbackDisplayProps {
  result: InstantFeedbackAnswerResult;
  className?: string;
}

export function FeedbackDisplay({
  result,
  className = "",
}: FeedbackDisplayProps) {
  const isCorrect = result.status === "Correct";
  const isTimedOut = result.status === "TimedOut";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex items-center justify-center gap-3 p-4 rounded-xl ${className}`}
      style={{
        backgroundColor: isCorrect
          ? "#10b98120"
          : isTimedOut
          ? "#f59e0b20"
          : "#ef444420",
        borderColor: isCorrect ? "#10b981" : isTimedOut ? "#f59e0b" : "#ef4444",
        borderWidth: "2px",
      }}>
      {/* Status Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className={`p-2 rounded-full ${
          isCorrect
            ? "bg-green-500"
            : isTimedOut
            ? "bg-yellow-500"
            : "bg-red-500"
        }`}>
        {isCorrect ? (
          <CheckCircle className="w-6 h-6 text-white" />
        ) : isTimedOut ? (
          <Clock className="w-6 h-6 text-white" />
        ) : (
          <XCircle className="w-6 h-6 text-white" />
        )}
      </motion.div>

      {/* Status Text and Score */}
      <div className="flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-lg font-semibold ${
            isCorrect
              ? "text-green-700 dark:text-green-300"
              : isTimedOut
              ? "text-yellow-700 dark:text-yellow-300"
              : "text-red-700 dark:text-red-300"
          }`}>
          {isCorrect ? "Correct!" : isTimedOut ? "Time's Up!" : "Incorrect"}
        </motion.span>

        {/* Score Display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1">
          <span className="text-2xl font-bold text-primary">
            +{result.scoreAwarded}
          </span>
          <span className="text-sm text-gray-500 font-medium">points</span>
        </motion.div>
      </div>

      {/* Time spent indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-gray-500 ml-auto">
        {result.timeSpentInSeconds.toFixed(1)}s
      </motion.div>
    </motion.div>
  );
}
