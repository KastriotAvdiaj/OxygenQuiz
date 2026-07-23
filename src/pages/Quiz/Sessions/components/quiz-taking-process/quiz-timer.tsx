import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { audio } from "@/lib/audio";

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
  // md is the in-game size (single- and multiplayer): compact on phones so the
  // question + answers + submit fit one viewport, full-size from sm up
  // (docs/RESPONSIVE.md).
  md: {
    container: "h-16 w-16 sm:h-24 sm:w-24",
    text: "text-lg sm:text-2xl",
    label: "text-[9px] sm:text-[10px]",
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
  // Wall-clock anchor: the timestamp at which time runs out. The displayed
  // value is always derived from this, never from counting ticks.
  const deadlineRef = useRef<number>(0);
  const timeLeftRef = useRef(initialTime);

  const handleTimeUp = useCallback(() => {
    if (!timeUpCalledRef.current) {
      timeUpCalledRef.current = true;
      onTimeUp();
    }
  }, [onTimeUp]);

  // Reset when question changes
  useEffect(() => {
    timeUpCalledRef.current = false;
    timeLeftRef.current = initialTime;
    setTimeLeft(initialTime);
  }, [initialTime]);

  // Wall-clock countdown — stops while paused or after time-up.
  //
  // Why wall-clock: mobile browsers freeze JS timers in backgrounded tabs, so
  // the old decrementing interval silently *paused* whenever the player left
  // the app mid-question — the display drifted ahead of the server, which keeps
  // grading against CurrentQuestionStartTime (SubmitAnswerService.cs) the whole
  // time. We anchor a deadline timestamp instead and recompute the remaining
  // time from Date.now() on every tick and on visibilitychange, so time spent
  // away counts and an expired question times out the moment the tab wakes.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeUpCalledRef.current || isPaused) return;

    // (Re)anchor the deadline from the current remaining time.
    deadlineRef.current = Date.now() + timeLeftRef.current * 1000;

    const sync = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000)
      );
      if (remaining !== timeLeftRef.current) {
        // Audible countdown for the final seconds — only on genuine 1s steps,
        // so a catch-up jump after backgrounding doesn't fire a tick burst.
        if (
          remaining > 0 &&
          remaining <= 5 &&
          remaining === timeLeftRef.current - 1
        ) {
          audio.play("tick");
        }
        timeLeftRef.current = remaining;
        setTimeLeft(remaining);
        onTick?.(remaining);
      }
      if (remaining <= 0) handleTimeUp();
    };

    // 250ms cadence: cheap, and the display recovers quickly after the browser
    // throttles timers. visibilitychange resyncs instantly on wake.
    intervalRef.current = setInterval(sync, 250);
    document.addEventListener("visibilitychange", sync);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", sync);
    };
  }, [handleTimeUp, onTick, isPaused, initialTime]);

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
