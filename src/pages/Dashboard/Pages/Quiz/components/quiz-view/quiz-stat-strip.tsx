import type { QuizAnalytics } from "@/types/analytics-types";
import { cn } from "@/utils/cn";

import { formatDuration } from "./format-duration";
import { StatTile } from "./stat-tile";

/** Thousands separators, because scores run to four and five figures (base 1000 per question). */
const formatScore = (score: number) => Math.round(score).toLocaleString();

/**
 * The headline numbers, ranked.
 *
 * <b>This was five identical boxes.</b> Attempts, Completion, Avg. score, Best run and Avg.
 * duration all wore the same border, the same label size and the same 2xl figure, so the strip
 * ranked nothing and the reader had to take all five in before knowing which one answered their
 * question. On this page one always does — how many people have played — and everything else is
 * a qualifier on it. Attempts now carries the emphasis; the rest support it.
 *
 * <b>Score gets a denominator.</b> "3,412" is uninterpretable on its own: the base is 1,000
 * points per question with up to a +50% speed bonus and a per-question multiplier, so the
 * ceiling is a property of the quiz, not a round number anyone can guess. `maxPossibleScore`
 * (computed in `ReportService` from `QuizScoring`, so it can't drift from what the grader
 * awards) makes it "3,412 of 4,500" — a proportion the reader can act on. A percentage was the
 * alternative and is worse: it hides the scale, and a player's own results screen shows points,
 * so an owner comparing the two would be converting in their head.
 *
 * <b>One attempt collapses Avg. score and Best run into one tile.</b> With a single play they
 * are the same number by definition, and printing it twice under two different labels implies a
 * spread that doesn't exist — the reader looks for the difference and finds none.
 *
 * Still absent, deliberately: "+9 this week" needs a windowed count the analytics endpoint
 * doesn't return (it takes no range from this page). See docs/proposals/quiz-view-redesign.md §2
 * — a plausible-looking number invented on the client is worse than no number.
 */
export interface QuizStatStripProps {
  analytics: QuizAnalytics;
  /**
   * How wide the strip may spread on a large screen. `"row"` puts every tile on one line;
   * `"two"` keeps it two-wide, for a strip sharing the row with something else.
   *
   * A prop rather than a guess from the container, because the two callers want genuinely
   * different things and a tile grid cannot read its own available width without measuring —
   * which would be an Effect synchronising with the DOM to decide a layout Tailwind can express
   * directly.
   */
  columns?: "row" | "two";
}

export const QuizStatStrip = ({
  analytics,
  columns = "row",
}: QuizStatStripProps) => {
  const singleAttempt = analytics.attempts === 1;
  const outOf =
    analytics.maxPossibleScore > 0
      ? `of ${formatScore(analytics.maxPossibleScore)} possible`
      : undefined;

  // Complete literals, picked between — never an interpolated column count (CLAUDE.md,
  // "Tailwind class strings stay complete literals"). In `row` mode the track has to match the
  // tile count exactly, and collapsing the score pair changes that from five to four: a
  // five-column track holding four tiles leaves a gap on the end.
  const track =
    columns === "two"
      ? "sm:grid-cols-2"
      : singleAttempt
        ? "lg:grid-cols-4"
        : "lg:grid-cols-5";

  return (
    <div className={cn("grid grid-cols-2 gap-3", track)}>
      <StatTile
        label="Attempts"
        value={analytics.attempts}
        hint="Signed-in plays only"
        emphasis
      />
      <StatTile
        label="Completion"
        value={`${analytics.completionRate}%`}
        hint={`${analytics.completed} finished · ${analytics.abandoned} dropped`}
      />

      {singleAttempt ? (
        <StatTile
          label="Score"
          value={formatScore(analytics.averageScore)}
          hint={outOf}
        />
      ) : (
        <>
          <StatTile
            label="Avg. score"
            value={formatScore(analytics.averageScore)}
            hint={outOf}
          />
          <StatTile
            label="Best run"
            value={formatScore(analytics.highestScore)}
            hint={outOf}
          />
        </>
      )}

      <StatTile
        label="Avg. duration"
        value={
          analytics.averageDurationSeconds > 0
            ? formatDuration(analytics.averageDurationSeconds)
            : "—"
        }
        hint={singleAttempt ? "This one run" : undefined}
      />
    </div>
  );
};
