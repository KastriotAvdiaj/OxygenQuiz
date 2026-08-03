import { useState, useEffect, useRef } from "react";
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
  // Wall-clock anchor: the timestamp at which time runs out. The displayed
  // value is always derived from this, never from counting ticks.
  const deadlineRef = useRef<number>(Date.now() + initialTime * 1000);
  const timeLeftRef = useRef(initialTime);
  const pausedAtRef = useRef<number | null>(null);

  // ── Latest-callback refs ──────────────────────────────────────────────────
  // The countdown effect below must not depend on `onTimeUp` / `onTick`
  // identity. Callers write these inline (`onTimeUp={() => setTimedOut(true)}`)
  // or derive them from an unmemoised prop, so they get a fresh identity on
  // every parent render — and an effect that restarts a countdown must never be
  // at the mercy of how often its parent happens to re-render.
  //
  // That was a real bug, not a theoretical one: a re-render storm from the
  // lobby's navigation blocker restarted this effect faster than its own 250ms
  // interval could fire, and the timer sat frozen on screen while the server
  // ran the question out and timed the player out. See
  // docs/quiz/quiz-timer.md.
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
    onTickRef.current = onTick;
  });

  // ── Anchor: once per question ─────────────────────────────────────────────
  // `initialTime` changing is what "a new question" means to this component,
  // and it is the ONLY thing that may re-anchor the deadline from scratch.
  // Anchoring anywhere else re-derives the deadline from the *rounded* display
  // value, which silently hands the player back up to a second each time.
  //
  // Declared before the pause effect on purpose: when a new question arrives
  // while paused, this clears the pause anchor so the resume below can't also
  // shift the fresh deadline.
  useEffect(() => {
    timeUpCalledRef.current = false;
    timeLeftRef.current = initialTime;
    pausedAtRef.current = null;
    deadlineRef.current = Date.now() + initialTime * 1000;
    setTimeLeft(initialTime);
  }, [initialTime]);

  // ── Pause / resume ────────────────────────────────────────────────────────
  // Push the deadline out by exactly how long we were paused. Shifting the
  // absolute deadline (rather than re-anchoring from `timeLeft`) keeps the
  // sub-second remainder, so pausing and resuming is lossless however many
  // times it happens.
  useEffect(() => {
    if (isPaused) {
      pausedAtRef.current = Date.now();
      return;
    }
    if (pausedAtRef.current !== null) {
      deadlineRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [isPaused]);

  // ── The countdown ─────────────────────────────────────────────────────────
  // Why wall-clock: mobile browsers freeze JS timers in backgrounded tabs, so
  // a decrementing interval silently *pauses* whenever the player leaves the
  // app mid-question — the display drifts ahead of the server, which keeps
  // grading against the question start time (SubmitAnswerService.cs /
  // MatchOrchestrator.cs) the whole time. We recompute from the anchored
  // deadline on every tick and on visibilitychange, so time spent away counts
  // and an expired question times out the moment the tab wakes.
  //
  // Dependencies are two primitives and nothing else. Anything that made this
  // list depend on a function or object identity would reintroduce the freeze.
  useEffect(() => {
    if (isPaused) return;

    const sync = () => {
      if (timeUpCalledRef.current) return;

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
        onTickRef.current?.(remaining);
      }
      if (remaining <= 0) {
        timeUpCalledRef.current = true;
        onTimeUpRef.current();
      }
    };

    // Sync immediately as well as on the interval: on resume the display should
    // be right on the next paint, not up to 250ms later.
    sync();

    // 250ms cadence: cheap, and the display recovers quickly after the browser
    // throttles timers. visibilitychange resyncs instantly on wake.
    const id = setInterval(sync, 250);
    document.addEventListener("visibilitychange", sync);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [initialTime, isPaused]);

  // Arc calculation — based on total question time, not just remaining.
  // Clamped because `timeLeft > total` is representable: a caller can pass an
  // `initialTime` derived from a server deadline and a `totalTime` that is the
  // question's nominal limit, and the two only agree if the clocks do. Rather
  // than let the ring wind past a full circle, cap it — the number in the middle
  // is the honest readout, the arc is decoration.
  const percentage =
    total > 0 ? Math.min(100, Math.max(0, (timeLeft / total) * 100)) : 0;
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
