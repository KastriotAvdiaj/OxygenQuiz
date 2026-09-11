import { Card, CardContent } from "@/components/ui/card";

export interface StatTileProps {
  label: string;
  value: string | number;
  /** One quiet line under the value — the denominator, the split, the caveat. */
  hint?: string;
}

/**
 * One cell of the stat strip.
 *
 * Lifted verbatim out of `quiz-analytics.tsx`, where it was a private component. It was already
 * generic (`label` / `value` / `hint`); it only needed a home now that the strip is used by the
 * page rather than by one tab.
 *
 * <b>Not `User/Components/stats-cards.tsx`.</b> That one looks like the reusable version and
 * isn't: four hard-coded literals with invented deltas ("+2.5% from last month"), its data hook
 * commented out, and no call sites anywhere. It should be deleted, not extended.
 *
 * `hint` is deliberately not styled as a delta. A percentage change needs a baseline, and with
 * most quizzes sitting on a handful of attempts there is no honest baseline to compute one from
 * — so the line carries a real denominator ("of 4,100 possible") or a real split
 * ("30 finished · 4 dropped") instead of a number that would mostly be noise.
 */
export const StatTile = ({ label, value, hint }: StatTileProps) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);
