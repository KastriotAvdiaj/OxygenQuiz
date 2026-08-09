/**
 * Cap on the alternative answers a type-the-answer question may carry.
 *
 * Matches the multiple-choice option cap so both question types share one number, and mirrors
 * `AcceptableAnswerRules.MaxCount` in the API — the API is the gate, this is the fast feedback
 * path. Keep the two in sync.
 */
export const MAX_ACCEPTABLE_ANSWERS = 4;

export const MAX_ACCEPTABLE_ANSWERS_MESSAGE = `You can add at most ${MAX_ACCEPTABLE_ANSWERS} acceptable answers.`;
