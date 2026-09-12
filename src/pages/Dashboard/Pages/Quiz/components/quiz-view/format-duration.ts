/**
 * Seconds, written the way a person says them.
 *
 * There were three near-identical copies of this before — one in `quiz-stat-strip.tsx`, one in
 * `question-performance-row.tsx`, and none at all on the quiz's own time limit, which is why the
 * hero line printed a raw `490s`. They had already drifted: two returned an em dash for zero,
 * and the page needed "None" in one place and "8m 10s" in another. One function, two call shapes.
 *
 * Deliberately not `Intl.RelativeTimeFormat` or a date library: these are elapsed spans, not
 * points in time, and the longest value the page can show is a quiz time limit, capped at
 * 2000 seconds by `QuizQuestionCM` (~33 minutes). Hours never arise.
 */

/**
 * A duration as `8m 10s` / `45s` / `4.2s`.
 *
 * Sub-minute values keep one decimal only when they have one, so an average answer time of 4.2s
 * stays precise while a 45-second time limit doesn't become `45.0s`.
 */
export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes === 0) {
    // Round to 1dp first, then drop a trailing ".0" — `4.25` reads as `4.3s`, `45` as `45s`.
    const rounded = Math.round(seconds * 10) / 10;
    return `${rounded}s`;
  }

  const wholeSeconds = Math.round(remainder);
  // 119.7s would otherwise render "1m 60s".
  if (wholeSeconds === 60) return `${minutes + 1}m`;
  return wholeSeconds === 0 ? `${minutes}m` : `${minutes}m ${wholeSeconds}s`;
};

/**
 * The same, for a cell that may legitimately have nothing to show. `empty` is the caller's word
 * for absence — "None" for a time limit that isn't set, an em dash in a numeric column.
 */
export const formatDurationOr = (seconds: number, empty: string): string =>
  seconds > 0 ? formatDuration(seconds) : empty;
