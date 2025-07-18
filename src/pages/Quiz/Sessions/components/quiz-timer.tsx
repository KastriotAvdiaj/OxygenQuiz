// src/components/quiz/QuizTimer.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface QuizTimerProps {
  initialTime: number;
  onTimeUp: () => void;
  primaryColor: string;
}

export function QuizTimer({
  initialTime,
  onTimeUp,
  primaryColor,
}: QuizTimerProps) {
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

    // Don't start timer if time is already up or timeUp has been called
    if (timeLeft <= 0 || timeUpCalledRef.current) {
      if (timeLeft <= 0 && !timeUpCalledRef.current) {
        handleTimeUp();
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime <= 0 && !timeUpCalledRef.current) {
          // Call handleTimeUp in the next tick to avoid state update during render
          setTimeout(() => handleTimeUp(), 0);
        }
        return Math.max(0, newTime);
      });
    }, 1000);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timeLeft, handleTimeUp]);

  const percentage = (timeLeft / initialTime) * 100;

  return (
    <div className="relative h-16 w-16">
      <svg className="h-full w-full" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          className="stroke-current text-gray-700"
          strokeWidth="10"
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
        ></circle>
        {/* Progress circle */}
        <motion.circle
          className="stroke-current"
          strokeWidth="10"
          strokeLinecap="round"
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
          strokeDasharray="283"
          strokeDashoffset={283 - (283 * percentage) / 100}
          style={{ color: primaryColor }}
          transform="rotate(-90 50 50)"
          transition={{ duration: 1, ease: "linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{timeLeft}</span>
      </div>
    </div>
  );
}
