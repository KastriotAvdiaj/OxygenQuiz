import { CreateQuizInput } from "../../api/create-quiz";
import { NewAnyQuestion } from "./types";

/**
 * A quiz and the questions authored inside it share one classification. New questions created
 * in the builder therefore **inherit the quiz's category and language** when they're saved —
 * the quiz is the single source of truth, so applying this at save time also covers the case
 * where the quiz's category/language changed after the question was added.
 *
 * Difficulty is deliberately NOT inherited: it stays whatever the question already carries (by
 * default the seeded "Unspecified" lookup). A quiz can mix questions of varying difficulty, and
 * each question's difficulty is rated on its own later — see docs/quiz/quiz-question-classification.md.
 *
 * This mirrors the AI-import invariant "category and language are always inherited from the
 * quiz, never Unspecified" (docs/quiz/ai-quiz-architecture.md §"The three invariants"), so the
 * manual and AI creation flows classify their questions the same way.
 *
 * @param question The new (unsaved, negative-id) question to file under the quiz.
 * @param quiz     The quiz-level values the question should inherit.
 */
export const inheritQuizClassification = <T extends NewAnyQuestion>(
  question: T,
  quiz: Pick<CreateQuizInput, "categoryId" | "languageId">,
): T => ({
  ...question,
  categoryId: quiz.categoryId,
  languageId: quiz.languageId,
  // difficultyId intentionally left as-is (Unspecified by default).
});
