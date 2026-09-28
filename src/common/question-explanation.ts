import { z } from "zod";

/**
 * A question's optional explanation — the "why" a player reads after answering.
 * See docs/quiz/question-explanations.md. The editor and the player-facing note are in
 * `QuestionExplanation.tsx`.
 *
 * Mirrors `QuestionExplanation.MaxLength` on the API, which is the gate; this is fast feedback.
 * The API also trims and turns blank into null, so nothing here has to.
 */
export const EXPLANATION_MAX_LENGTH = 1000;

export const EXPLANATION_TOO_LONG_MESSAGE = `An explanation can be at most ${EXPLANATION_MAX_LENGTH} characters.`;

/** The field, as every question create/update schema declares it. Mirrors `QuestionExplanation.Normalize`. */
export const explanationSchema = z
  .string()
  .max(EXPLANATION_MAX_LENGTH, EXPLANATION_TOO_LONG_MESSAGE)
  .nullable()
  .optional();

/**
 * How long the feedback screen stays up before auto-advancing, when it shows an explanation.
 *
 * Scaled to the text — about 200 words a minute plus a beat to take in the verdict — so a
 * one-line explanation doesn't hold the quiz for ten seconds. Capped at `allowanceSeconds`, which
 * the server sends with the result (`readingAllowanceSeconds`): it is the reading slack the
 * session's deadline grants the question, so waiting longer could run the session out while the
 * player reads (docs/quiz/session-lifecycle.md, "The timing rules"). Never shorter than the
 * default countdown.
 */
export const DEFAULT_ADVANCE_SECONDS = 3;

const WORDS_PER_SECOND = 3.3;

/** A beat to take in the verdict before the reading starts. */
const VERDICT_SECONDS = 2;

export const explanationReadingSeconds = (
  explanation: string,
  allowanceSeconds: number,
): number => {
  const words = explanation.trim().split(/\s+/).filter(Boolean).length;
  const wanted = VERDICT_SECONDS + Math.ceil(words / WORDS_PER_SECOND);
  return Math.max(DEFAULT_ADVANCE_SECONDS, Math.min(wanted, allowanceSeconds));
};
