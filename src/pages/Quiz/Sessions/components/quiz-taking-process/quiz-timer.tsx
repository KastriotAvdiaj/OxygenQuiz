// src/components/quiz/QuizTimer.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

type TimerSize = "sm" | "md" | "lg" | "xl";

interface QuizTimerProps {
  initialTime: number;
  onTimeUp: () => void;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
  size?: TimerSize;
}

const CIRCLE_CIRCUMFERENCE = 283;
const LOW_TIME_THRESHOLD = 25;
const CRITICAL_TIME_THRESHOLD = 10;

const SIZE_CLASSES: Record<TimerSize, { container: string; text: string }> = {
  sm: { container: "h-16 w-16", text: "text-lg" },
  md: { container: "h-24 w-24", text: "text-2xl" },
  lg: { container: "h-32 w-32", text: "text-4xl" },
  xl: { container: "h-40 w-40", text: "text-5xl" },
};

export function QuizTimer({
  initialTime,
  onTimeUp,
  size = "lg",
}: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timeUpCalledRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleTimeUp = useCallback(() => {
    if (!timeUpCalledRef.current) {
      timeUpCalledRef.current = true;
      onTimeUp();
    }
  }, [onTimeUp]);

  useEffect(() => {
    timeUpCalledRef.current = false;
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (timeUpCalledRef.current) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime <= 0 && !timeUpCalledRef.current) {
          setTimeout(() => handleTimeUp(), 0);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handleTimeUp]);

  const percentage = (timeLeft / initialTime) * 100;
  const isLowTime = percentage < LOW_TIME_THRESHOLD;
  const isCriticalTime = percentage < CRITICAL_TIME_THRESHOLD;

  const getTimerColor = (): string => {
    if (isCriticalTime) return "#ef4444";
    if (isLowTime) return "#f59e0b";
    return "#103bfcff";
  };

  const getTextColorClass = (): string => {
    if (isCriticalTime) return "text-red-400";
    if (isLowTime) return "text-yellow-400";
    return "quiz-text-primary";
  };

  const sizeClasses = SIZE_CLASSES[size];

  return (
    <motion.div
      className={`quiz-timer relative ${sizeClasses.container}`}
      animate={isCriticalTime ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5, repeat: isCriticalTime ? Infinity : 0 }}>
      <svg className="h-full w-full" viewBox="0 0 100 100">
        <circle
          className="stroke-current text-quiz-border-subtle"
          strokeWidth="8"
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
        />
        <motion.circle
          className="stroke-current"
          strokeWidth="8"
          strokeLinecap="round"
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={
            CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * percentage) / 100
          }
          style={{ color: getTimerColor() }}
          transform="rotate(-90 50 50)"
          transition={{ duration: 1, ease: "linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`${
            sizeClasses.text
          } font-bold transition-colors duration-300 ${getTextColorClass()}`}>
          {timeLeft}
        </span>
      </div>
    </motion.div>
  );
}
