import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

type TimerSize = "sm" | "md" | "lg" | "xl";

interface QuizTimerProps {
  /** Time remaining (seconds) — the countdown starts from this value. */
  initialTime: number;
  /**
   * Total time for the question (seconds).
   * Used to calculate the correct arc position on resume.
   * Falls back to initialTime if not provided (fresh question).
   */
  totalTime?: number;
  onTimeUp: () => void;
  onTick?: (timeLeft: number) => void;
  size?: TimerSize;
  /** When true, the countdown freezes at its current value. */
  isPaused?: boolean;
}

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const LOW_TIME_THRESHOLD = 25; // percentage
const CRITICAL_TIME_THRESHOLD = 10; // percentage

const SIZE_CONFIG: Record<
  TimerSize,
  { container: string; text: string; label: string; stroke: number }
> = {
  sm: {
    container: "h-16 w-16",
    text: "text-lg",
    label: "text-[9px]",
    stroke: 6,
  },
  md: {
    container: "h-24 w-24",
    text: "text-2xl",
    label: "text-[10px]",
    stroke: 7,
  },
  lg: { container: "h-32 w-32", text: "text-4xl", label: "text-xs", stroke: 8 },
  xl: { container: "h-40 w-40", text: "text-5xl", label: "text-sm", stroke: 8 },
};

export function QuizTimer({
  initialTime,
  totalTime,
  onTimeUp,
  onTick,
  size = "lg",
  isPaused = false,
}: QuizTimerProps) {
  const total = totalTime ?? initialTime;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timeUpCalledRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleTimeUp = useCallback(() => {
    if (!timeUpCalledRef.current) {
      timeUpCalledRef.current = true;
      onTimeUp();
    }
  }, [onTimeUp]);

  // Reset when question changes
  useEffect(() => {
    timeUpCalledRef.current = false;
    setTimeLeft(initialTime);
  }, [initialTime]);

  // Countdown interval — stops when paused or timed out
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeUpCalledRef.current || isPaused) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !timeUpCalledRef.current) {
          setTimeout(() => handleTimeUp(), 0);
          onTick?.(0);
          return 0;
        }
        onTick?.(next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handleTimeUp, onTick, isPaused]);

  // Arc calculation — based on total question time, not just remaining
  const percentage = total > 0 ? (timeLeft / total) * 100 : 0;
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * percentage) / 100;
  const isLow = percentage < LOW_TIME_THRESHOLD;
  const isCritical = percentage < CRITICAL_TIME_THRESHOLD;

  // Color scheme
  const ringColor = isCritical
    ? "#ef4444"
    : isLow
      ? "#f59e0b"
      : "rgb(37, 99, 235)";

  const glowColor = isCritical
    ? "rgba(239, 68, 68, 0.4)"
    : isLow
      ? "rgba(245, 158, 11, 0.3)"
      : "rgba(99, 102, 241, 0.2)";

  const cfg = SIZE_CONFIG[size];

  return (
    <motion.div
      className={`relative ${cfg.container}`}
      animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
      transition={{
        duration: 0.6,
        repeat: isCritical ? Infinity : 0,
        ease: "easeInOut",
      }}
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={cfg.stroke}
        />

        {/* Glow layer (behind the main arc) */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
          stroke={glowColor}
          strokeWidth={cfg.stroke + 4}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ filter: "blur(4px)" }}
        />

        {/* Main progress arc */}
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
          stroke={ringColor}
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "linear" }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
        <motion.span
          key={timeLeft}
          initial={{ scale: 1.15, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className={`${cfg.text} font-bold tabular-nums`}
        >
          {timeLeft}
        </motion.span>
        <span
          className={`${cfg.label} uppercase tracking-widest text-foreground/40 font-medium`}
        >
          sec
        </span>
      </div>
    </motion.div>
  );
}
