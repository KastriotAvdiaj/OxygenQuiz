import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

export type CountdownRingSize = "sm" | "md" | "lg" | "xl";

/** How urgent the time left is. The caller decides the thresholds; the ring only draws them. */
export type CountdownTone = "normal" | "low" | "critical";

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SIZE_CONFIG: Record<CountdownRingSize, { container: string; text: string; label: string; stroke: number }> = {
  sm: { container: "h-16 w-16", text: "text-lg", label: "text-[9px]", stroke: 6 },
  // md is the in-game size (Classic questions, the Associations board and Duel turn): compact on
  // phones so the play area fits one viewport, full-size from sm up (docs/RESPONSIVE.md).
  md: { container: "h-16 w-16 sm:h-24 sm:w-24", text: "text-lg sm:text-2xl", label: "text-[9px] sm:text-[10px]", stroke: 7 },
  lg: { container: "h-32 w-32", text: "text-4xl", label: "text-xs", stroke: 8 },
  xl: { container: "h-40 w-40", text: "text-5xl", label: "text-sm", stroke: 8 },
};

// Complete literals per tone (CLAUDE.md: class strings are never built). Normal and low are theme
// tokens; critical is the palette's red-500 rather than `destructive`, whose dark-mode value is a
// background red too dim to read as a ring on a dark page.
const TONE_CLASSES: Record<CountdownTone, { ring: string; glow: string }> = {
  normal: { ring: "stroke-primary", glow: "stroke-primary/20" },
  low: { ring: "stroke-quiz-warning", glow: "stroke-quiz-warning/30" },
  critical: { ring: "stroke-red-500", glow: "stroke-red-500/40" },
};

/**
 * The round timer every quiz format plays against: an arc that empties with the time, and the
 * readout in the middle. It only draws — the countdown belongs to the caller (`QuizTimer` for a
 * Classic question, `useBoardClock` for an Associations board), which is where the rules of
 * docs/quiz/quiz-timer.md live.
 */
export const CountdownRing = ({
  fraction,
  value,
  unit,
  tone,
  size = "lg",
  label = "Time left",
}: {
  /** Share of the time still left, 0–1. Clamped: the readout is the honest number, the arc is decoration. */
  fraction: number;
  /** The readout — "12", "3:05". A new value pops in. */
  value: string;
  /** Under the readout — "sec", "min". */
  unit: string;
  tone: CountdownTone;
  size?: CountdownRingSize;
  label?: string;
}) => {
  const clamped = Math.min(1, Math.max(0, fraction));
  const offset = CIRCUMFERENCE * (1 - clamped);
  const critical = tone === "critical";
  const cfg = SIZE_CONFIG[size];
  const colors = TONE_CLASSES[tone];

  return (
    <motion.div
      role="timer"
      aria-label={label}
      className={cn("relative", cfg.container)}
      animate={critical ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.6, repeat: critical ? Infinity : 0, ease: "easeInOut" }}
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={RADIUS} fill="transparent" className="stroke-foreground/10" strokeWidth={cfg.stroke} />
        {/* Glow, behind the arc. */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
          className={colors.glow}
          strokeWidth={cfg.stroke + 4}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ filter: "blur(4px)" }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
          className={colors.ring}
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "linear" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
        <motion.span
          key={value}
          initial={{ scale: 1.15, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(cfg.text, "font-bold tabular-nums")}
        >
          {value}
        </motion.span>
        <span className={cn(cfg.label, "font-medium uppercase tracking-widest text-foreground/40")}>{unit}</span>
      </div>
    </motion.div>
  );
};
