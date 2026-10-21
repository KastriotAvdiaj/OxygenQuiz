import type { QuestionSettings, QuizQuestion } from "./types";

/**
 * Undo for removing a question from the quiz being built or edited.
 *
 * A **stack**, not a single slot: remove three questions and Undo three times, and each comes
 * back — newest first — at the position it left, with the points and time limit it had. It only
 * undoes removals; edits, reorders and additions are not on it. It lives as long as the builder
 * does: saving or leaving the page ends it (docs/quiz/quiz-editing.md, "Removing a question").
 *
 * Pure functions so the order rules are unit-tested without rendering the builder.
 */

export type RemovedQuestion = {
  question: QuizQuestion;
  settings: QuestionSettings;
  /** Where it sat when it was removed — where Undo puts it back. */
  index: number;
};

/** Record a removal. `index` is the question's position at that moment. */
export const pushRemoval = (stack: RemovedQuestion[], entry: RemovedQuestion): RemovedQuestion[] => [
  ...stack,
  entry,
];

/** The removal Undo would reverse next, or null. */
export const peekRemoval = (stack: RemovedQuestion[]): RemovedQuestion | null =>
  stack.length > 0 ? stack[stack.length - 1] : null;

/** The stack without its newest entry. */
export const popRemoval = (stack: RemovedQuestion[]): RemovedQuestion[] => stack.slice(0, -1);

/**
 * Put `entry.question` back into `list` at its old index — clamped to the end, since the list may
 * have shrunk since. A question already back in the list (re-added from the bank meanwhile) is
 * left where it is.
 */
export const reinsert = (list: QuizQuestion[], entry: RemovedQuestion): QuizQuestion[] => {
  if (list.some((q) => q.id === entry.question.id)) return list;
  const next = [...list];
  next.splice(Math.min(entry.index, next.length), 0, entry.question);
  return next;
};
