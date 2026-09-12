import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";

export interface StatTileProps {
  label: string;
  value: string | number;
  /** One quiet line under the value — the denominator, the split, the caveat. */
  hint?: string;
  /**
   * The one tile the eye should land on first. Exactly one tile in a strip should set it:
   * emphasis shared by everything is emphasis by nothing.
   */
  emphasis?: boolean;
}

/**
 * One cell of the stat strip.
 *
 * Lifted verbatim out of `quiz-analytics.tsx`, where it was a private component. It was already
 * generic (`label` / `value` / `hint`); it only needed a home now that the strip is used by the
 * page rather than by one tab.
 *
 * <b>`emphasis` exists because five identical boxes rank nothing.</b> The strip previously gave
 * "Attempts" and "Avg. duration" the same weight, the same border and the same type size, so the
 * reader had to read all five to find the one that matters — and on this page one of them always
 * does: how many people have played. A ring and a larger figure make that tile the entry point
 * and the rest supporting detail. This is presentation only; nothing about the numbers changes.
 *
 * <b>Not `User/Components/stats-cards.tsx`.</b> That one looks like the reusable version and
 * isn't: four hard-coded literals with invented deltas ("+2.5% from last month"), its data hook
 * commented out, and no call sites anywhere. It should be deleted, not extended.
 *
 * `hint` is deliberately not styled as a delta. A percentage change needs a baseline, and with
 * most quizzes sitting on a handful of attempts there is no honest baseline to compute one from
 * — so the line carries a real denominator ("of 4,500 possible") or a real split
 * ("30 finished · 4 dropped") instead of a number that would mostly be noise.
 */
export const StatTile = ({
  label,
  value,
  hint,
  emphasis = false,
}: StatTileProps) => (
  <Card
    className={cn(
      emphasis &&
        "border-primary/40 bg-primary/5 dark:border dark:border-primary/30",
    )}
  >
    <CardContent className="p-4">
      <p
        className={cn(
          "text-sm text-muted-foreground",
          emphasis && "font-medium text-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-bold tabular-nums",
          emphasis ? "text-3xl" : "text-2xl",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);
