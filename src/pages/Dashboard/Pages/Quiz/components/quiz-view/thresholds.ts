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
 * Answers a single question needs before its correct rate is shown at all. Below this the cell
 * shows an em dash and says why.
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
 * True when a question is weak enough to be worth the author's attention.
 *
 * Gated on the same answer floor as the rate itself: flagging a question for a 0% built from one
 * answer would send an author to rewrite something that has not been shown to be broken. "Under
 * half get it right" is a prompt to look, not a verdict — a genuinely hard question and a badly
 * worded one are indistinguishable from here, and only the author can tell them apart.
 */
export const needsALook = (stats?: QuizQuestionAnalyticsRow) =>
  stats !== undefined &&
  stats.timesAnswered >= MIN_ANSWERS_FOR_RATE &&
  stats.correctRate < 50;
