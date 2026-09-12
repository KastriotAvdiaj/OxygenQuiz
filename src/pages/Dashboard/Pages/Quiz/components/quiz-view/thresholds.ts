import type { QuizQuestionAnalyticsRow } from "@/types/analytics-types";

/**
 * How much data a number needs before it is allowed to claim anything.
 *
 * Most quizzes will sit on a handful of attempts forever, so these are the normal case, not an
 * edge case. A correct rate of "100%" off one answer is not a fact about the question, it is a
 * fact about there being one answer — and printing it invites the author to rewrite a question
 * that was never shown to be broken.
 *
 * Both numbers are deliberately low. They are the point where a figure stops being a coin flip,
 * not the point where it becomes reliable.
 */

/**
 * Graded answers a single question needs before its correct rate is shown at all. Below this the
 * cell states what it is waiting for — see `rateState` below, and the cell in
 * `question-performance-row.tsx`, which spells the reason out rather than printing a bare dash.
 */
export const MIN_ANSWERS_FOR_RATE = 5;

/**
 * Attempts the quiz needs before a trend line is drawn. Below this, the same axis frame is kept
 * and the individual attempts are plotted as discrete marks — a line through three points
 * implies a direction that three points cannot support.
 */
export const MIN_ATTEMPTS_FOR_TREND = 10;

/**
 * Why the numbers on this page can undercount, stated once so every surface says it the same way.
 *
 * Guest sessions and their answers are **deleted** the moment the guest views their results, and
 * the abandonment sweep deletes rather than marks them (docs/auth/guest-play.md). So analytics
 * only ever describe signed-in plays. An owner who shares a quiz widely and sees a low attempt
 * count is otherwise being quietly misled.
 */
export const SIGNED_IN_ONLY_NOTE =
  "Counts signed-in plays only — guest attempts aren't kept.";

/**
 * Why a question's correct rate is, or isn't, showable — as one named state rather than a
 * comparison repeated at every call site.
 *
 * The cell, the "Needs a look" flag and the "Hardest first" sort all have to agree on this. They
 * used to each re-derive it from `timesAnswered >= MIN_ANSWERS_FOR_RATE`, which is how the sort
 * came to silently fall back to quiz order while its tab still looked live: nothing tied the
 * comparator's view of "rated" to anything the user could see.
 *
 * `gradedCount` rather than `timesAnswered` is the gate, because the rate's denominator is
 * `gradedCount` (see `QuizQuestionAnalyticsRow`). A question with five answers all stuck Pending
 * has no rate, and saying "needs 5 answers" to someone who can see "5 answered" would be a lie.
 */
export type RateState =
  | { kind: "rated" }
  | { kind: "no-answers" }
  | { kind: "too-few"; graded: number }
  | { kind: "awaiting-grading"; ungraded: number };

export const rateState = (stats?: QuizQuestionAnalyticsRow): RateState => {
  const answered = stats?.timesAnswered ?? 0;
  const graded = stats?.gradedCount ?? 0;
  const ungraded = stats?.ungradedCount ?? 0;

  if (answered === 0) return { kind: "no-answers" };
  if (graded === 0 && ungraded > 0) return { kind: "awaiting-grading", ungraded };
  if (graded < MIN_ANSWERS_FOR_RATE) return { kind: "too-few", graded };
  return { kind: "rated" };
};

/** True when at least one question has a showable rate — i.e. sorting by it can do something. */
export const anyRateIsShowable = (rows: (QuizQuestionAnalyticsRow | undefined)[]) =>
  rows.some((row) => rateState(row).kind === "rated");

/**
 * True when a question is weak enough to be worth the author's attention.
 *
 * Gated on the same answer floor as the rate itself: flagging a question for a 0% built from one
 * answer would send an author to rewrite something that has not been shown to be broken. "Under
 * half get it right" is a prompt to look, not a verdict — a genuinely hard question and a badly
 * worded one are indistinguishable from here, and only the author can tell them apart.
 */
export const needsALook = (stats?: QuizQuestionAnalyticsRow) =>
  rateState(stats).kind === "rated" && stats!.correctRate < 50;
