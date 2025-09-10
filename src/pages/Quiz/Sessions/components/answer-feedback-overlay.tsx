// src/components/quiz/AnswerFeedbackOverlay.tsx

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Trophy } from "lucide-react";
import { AnswerResult, AnswerStatus } from "../quiz-session-types";

interface AnswerFeedbackOverlayProps {
  result: AnswerResult;
  onNext: () => void;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
}

const feedbackDetails = {
  [AnswerStatus.Correct]: {
    Icon: CheckCircle2,
    text: "Correct!",
    subtitle: "Well done!",
    color: "#10b981",
    bgColor: "#10b98120",
    borderColor: "#10b98140",
  },
  [AnswerStatus.Incorrect]: {
    Icon: XCircle,
    text: "Incorrect",
    subtitle: "Better luck next time!",
    color: "#ef4444",
    bgColor: "#ef444420",
    borderColor: "#ef444440",
  },
  [AnswerStatus.TimedOut]: {
    Icon: Clock,
    text: "Time's Up!",
    subtitle: "You ran out of time",
    color: "#f59e0b",
    bgColor: "#f59e0b20",
    borderColor: "#f59e0b40",
  },
  [AnswerStatus.NotAnswered]: {
    Icon: XCircle,
    text: "No Answer",
    subtitle: "No selection made",
    color: "#6b7280",
    bgColor: "#6b728020",
    borderColor: "#6b728040",
  },
};

export function AnswerFeedbackOverlay({
  result,
//   onNext,
  theme,
}: AnswerFeedbackOverlayProps) {
  const details =
    feedbackDetails[result.status] ?? feedbackDetails[AnswerStatus.NotAnswered];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -50 }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          type: "spring",
          damping: 15,
          stiffness: 300,
        }}
        className="relative mx-4 max-w-md w-full"
      >
        {/* Main feedback card */}
        <div
          className="relative overflow-hidden rounded-2xl p-8 text-center space-y-6 shadow-2xl"
          style={{
            backgroundColor: details.bgColor,
            border: `2px solid ${details.borderColor}`,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Animated background effect */}
          <div className="absolute inset-0 opacity-10">
            <motion.div
              className="absolute inset-0"
              style={{ backgroundColor: details.color }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Icon with bounce animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              damping: 10,
              stiffness: 200,
            }}
            className="relative z-10"
          >
            <details.Icon
              className="h-16 w-16 mx-auto"
              style={{ color: details.color }}
            />
          </motion.div>

          {/* Feedback text with stagger animation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2 relative z-10"
          >
            <h2 className="text-3xl font-bold" style={{ color: details.color }}>
              {details.text}
            </h2>
            <p className="text-lg opacity-80" style={{ color: details.color }}>
              {details.subtitle}
            </p>
          </motion.div>

          {/* Score display with trophy icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.4,
              type: "spring",
              damping: 15,
              stiffness: 300,
            }}
            className="relative z-10"
          >
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                backgroundColor: `${theme.primary}20`,
                border: `2px solid ${theme.primary}40`,
              }}
            >
              <Trophy className="h-6 w-6" style={{ color: theme.primary }} />
              <div className="text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: theme.primary }}
                >
                  +{result.scoreAwarded}
                </div>
                <div
                  className="text-sm opacity-70"
                  style={{ color: theme.primary }}
                >
                  points
                </div>
              </div>
            </div>
          </motion.div>

          {/* Auto-advance indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="relative z-10"
          >
            <div className="flex items-center justify-center gap-2 text-sm opacity-60">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
              <span style={{ color: theme.primary }}>
                Next question loading...
              </span>
            </div>
          </motion.div>

          {/* Subtle particle effects */}
          {result.status === AnswerStatus.Correct && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: details.color,
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                  }}
                  animate={{
                    y: [-20, -60, -20],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.5 + Math.random() * 0.5,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
              ))}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
