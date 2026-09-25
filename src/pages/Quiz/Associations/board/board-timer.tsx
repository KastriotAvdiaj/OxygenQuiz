import { cn } from "@/utils/cn";
import { formatClock } from "./board-model";

/**
 * The Solo board clock, big enough to play against: the time left, and a bar that empties with
 * it. It only draws — the countdown is `useBoardClock`'s, and the deadline is the server's.
 * Turns destructive in the last `lowAtMs` (30 seconds by default — a Duel turn, itself 30s, uses 10).
 * Also the Duel's turn clock.
 */
export const BoardTimer = ({
  remainingMs,
  totalSeconds,
  lowAtMs = 30_000,
  label = "Time left",
}: {
  remainingMs: number;
  totalSeconds: number;
  lowAtMs?: number;
  label?: string;
}) => {
  const low = remainingMs <= lowAtMs;
  const fraction = totalSeconds > 0 ? Math.min(1, remainingMs / (totalSeconds * 1000)) : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        role="timer"
        aria-label={label}
        className={cn(
          "text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
          low ? "text-destructive" : "text-foreground"
        )}
      >
        {formatClock(remainingMs)}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={cn("h-full rounded-full transition-[width] duration-300 ease-linear", low ? "bg-destructive" : "bg-primary")}
          // A runtime width is a style, not a class (CLAUDE.md: class strings stay literal).
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
};
