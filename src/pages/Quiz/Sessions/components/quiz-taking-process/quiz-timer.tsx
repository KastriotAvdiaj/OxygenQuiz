// src/components/quiz/QuizTimer.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface QuizTimerProps {
  initialTime: number;
  onTimeUp: () => void;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
}

export function QuizTimer({ initialTime, onTimeUp, theme }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timeUpCalledRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the onTimeUp callback to prevent unnecessary re-renders
  const handleTimeUp = useCallback(() => {
    if (!timeUpCalledRef.current) {
      timeUpCalledRef.current = true;
      onTimeUp();
    }
  }, [onTimeUp]);

  useEffect(() => {
    // Reset the timeUpCalled flag when initialTime changes (new question)
    timeUpCalledRef.current = false;
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Don't start timer if timeUp has been called
    if (timeUpCalledRef.current) {
      return;
    }

    // Start the timer
    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime <= 0 && !timeUpCalledRef.current) {
          // Call handleTimeUp in the next tick to avoid state update during render
          setTimeout(() => handleTimeUp(), 0);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handleTimeUp]); // Remove timeLeft from dependencies to prevent unnecessary re-renders

  const percentage = (timeLeft / initialTime) * 100;
  const isLowTime = percentage < 25;
  const isCriticalTime = percentage < 10;

  return (
    <motion.div
      className="quiz-timer relative h-16 w-16"
      animate={isCriticalTime ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5, repeat: isCriticalTime ? Infinity : 0 }}
    >
      <svg className="h-full w-full" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          className="stroke-current text-quiz-border-subtle"
          strokeWidth="8"
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
        />
        {/* Progress circle */}
        <motion.circle
          className="stroke-current"
          strokeWidth="8"
          strokeLinecap="round"
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
          strokeDasharray="283"
          strokeDashoffset={283 - (283 * percentage) / 100}
          style={{
            color: isCriticalTime
              ? "#ef4444" // Red for critical time
              : isLowTime
              ? "#f59e0b" // Yellow for low time
              : theme.primary,
          }}
          transform="rotate(-90 50 50)"
          transition={{ duration: 1, ease: "linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-xl font-bold transition-colors duration-300 ${
            isCriticalTime
              ? "text-red-400"
              : isLowTime
              ? "text-yellow-400"
              : "quiz-text-primary"
          }`}
        >
          {timeLeft}
        </span>
      </div>
    </motion.div>
  );
}
