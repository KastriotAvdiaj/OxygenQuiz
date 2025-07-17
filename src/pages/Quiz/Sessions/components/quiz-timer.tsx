// src/components/quiz/QuizTimer.tsx

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface QuizTimerProps {
  initialTime: number;
  onTimeUp: () => void;
  primaryColor: string;
}

export function QuizTimer({ initialTime, onTimeUp, primaryColor }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    // This cleanup function is essential to prevent memory leaks
    return () => clearInterval(timerId);
  }, [timeLeft, onTimeUp]);

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