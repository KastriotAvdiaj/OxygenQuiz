// src/components/quiz/AnswerFeedback.tsx

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, ArrowRight, Trophy } from "lucide-react";
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
    subtitle: "You got it right!",
    color: "#10b981",
    bgGradient: "from-green-500/20 to-green-600/20",
  },
  [AnswerStatus.Incorrect]: {
    Icon: XCircle,
    text: "Not quite right",
    subtitle: "Better luck with the next one!",
    color: "#ef4444",
    bgGradient: "from-red-500/20 to-red-600/20",
  },
  [AnswerStatus.TimedOut]: {
    Icon: Clock,
    text: "Time's up!",
    subtitle: "You ran out of time",
    color: "#f59e0b",
    bgGradient: "from-yellow-500/20 to-yellow-600/20",
  },
  [AnswerStatus.NotAnswered]: {
    Icon: XCircle,
    text: "No answer",
    subtitle: "No selection was made",
    color: "#6b7280",
    bgGradient: "from-gray-500/20 to-gray-600/20",
  },
};

export function FinalResult({ result, onNext, theme }: AnswerFeedbackProps) {
  const details =
    feedbackDetails[result.status] ?? feedbackDetails[AnswerStatus.NotAnswered];

  // Special handling for quiz completion
  if (result.isQuizComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
        }}
        className="quiz-card-elevated p-8 text-center space-y-8 relative overflow-hidden"
      >
        {/* Celebration background */}
        <div className="absolute inset-0 opacity-10">
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br ${details.bgGradient}`}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Quiz Complete Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.2,
            type: "spring",
            damping: 12,
            stiffness: 200,
          }}
          className="relative z-10"
        >
          <Trophy
            className="h-24 w-24 mx-auto"
            style={{ color: theme.primary }}
          />
        </motion.div>

        {/* Quiz Complete Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold quiz-text-primary">
            Quiz Complete! 🎉
          </h2>
          <p className="quiz-text-secondary text-xl">
            Congratulations! You've finished the quiz.
          </p>
        </motion.div>

        {/* Final Score Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.6,
            type: "spring",
            damping: 15,
            stiffness: 300,
          }}
          className="relative z-10"
        >
          <div
            className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl"
            style={{
              backgroundColor: `${theme.primary}20`,
              border: `2px solid ${theme.primary}40`,
            }}
          >
            <Trophy className="h-8 w-8" style={{ color: theme.primary }} />
            <div className="text-center">
              <div
                className="text-3xl font-bold"
                style={{ color: theme.primary }}
              >
                +{result.scoreAwarded}
              </div>
              <div
                className="text-lg opacity-70"
                style={{ color: theme.primary }}
              >
                final points
              </div>
            </div>
          </div>
        </motion.div>

        {/* View Results Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="relative z-10"
        >
          <Button
            onClick={onNext}
            size="lg"
            className="px-10 py-4 text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-white"
            style={{ backgroundColor: theme.primary }}
          >
            View Detailed Results
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
        </motion.div>

        {/* Celebration particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: theme.primary,
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [-30, -80, -30],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              rotate: [0, 360, 720],
            }}
            transition={{
              duration: 3,
              delay: 0.8 + Math.random() * 1,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        ))}
      </motion.div>
    );
  }

  // Regular answer feedback (for non-instant feedback mode)
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
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${details.bgGradient}`}
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Icon with animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        className="relative z-10"
      >
        <details.Icon
          className="h-20 w-20 mx-auto"
          style={{ color: details.color }}
        />
      </motion.div>

      {/* Feedback text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3 relative z-10"
      >
        <h2
          className="text-3xl md:text-4xl font-bold"
          style={{ color: details.color }}
        >
          {details.text}
        </h2>
        <p className="text-lg opacity-80" style={{ color: details.color }}>
          {details.subtitle}
        </p>
      </motion.div>

      {/* Score display */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        className="relative z-10"
      >
        <div
          className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full"
          style={{
            backgroundColor: `${theme.primary}20`,
            border: `2px solid ${theme.primary}40`,
          }}
        >
          <Trophy className="h-6 w-6" style={{ color: theme.primary }} />
          <div className="text-center">
            <span
              className="text-2xl font-bold"
              style={{ color: theme.primary }}
            >
              +{result.scoreAwarded}
            </span>
            <span
              className="text-sm opacity-70 ml-1"
              style={{ color: theme.primary }}
            >
              points
            </span>
          </div>
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
          Next Question
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
