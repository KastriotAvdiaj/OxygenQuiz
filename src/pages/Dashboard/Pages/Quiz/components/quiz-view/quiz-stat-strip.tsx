import type { QuizAnalytics } from "@/types/analytics-types";

import { StatTile } from "./stat-tile";

const formatDuration = (seconds: number) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  if (m === 0) return `${seconds.toFixed(1)}s`;
  return `${m}m ${Math.round(seconds % 60)}s`;
};

/**
 * The five headline numbers.
 *
 * Each carries a sub-line that gives the number a denominator, because a bare figure invites the
 * wrong reading: "12 attempts" sounds like a verdict on the quiz until you know that guests
 * aren't counted, and an average score means nothing without the total available.
 *
 * <b>Two of the brief's sub-lines are absent, deliberately.</b> "+9 this week" needs a windowed
 * count the analytics endpoint doesn't return (it takes no range from this page), and
 * "Perfect · 2 players" needs a maximum-possible score that isn't computed anywhere. Both are
 * derivable and both are backend work — see docs/proposals/quiz-view-redesign.md §2 — and a
 * plausible-looking number invented on the client is worse than no number.
 */
export const QuizStatStrip = ({ analytics }: { analytics: QuizAnalytics }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
    <StatTile
      label="Attempts"
      value={analytics.attempts}
      hint="Signed-in plays only"
    />
    <StatTile
      label="Completion"
      value={`${analytics.completionRate}%`}
      hint={`${analytics.completed} finished · ${analytics.abandoned} dropped`}
    />
    <StatTile label="Avg. score" value={analytics.averageScore} />
    <StatTile label="Best run" value={analytics.highestScore} />
    <StatTile
      label="Avg. duration"
      value={formatDuration(analytics.averageDurationSeconds)}
    />
  </div>
);
