import { QuestionType, type AnyQuestion } from "@/types/question-types";
import type { NewAnyQuestion } from "./types";

/**
 * A saved question, turned into a new draft so it can be edited **for this quiz only**.
 *
 * A saved question (positive id) is a row in the shared question bank: the same row can sit in
 * other quizzes, and played sessions point at it. So the builder never edits it in place.
 * "Edit for this quiz" swaps it, at the same position and with the same points and time limit,
 * for a draft carrying the same content; saving the quiz creates the draft as a new question and
 * points the quiz at it. The original and every other quiz using it are untouched.
 *
 * The draft is the user's own and starts **Private**, like every question written in the
 * builder (`DEFAULT_NEW_*`) — copying someone else's Public question must not put a duplicate of
 * it in the public pool under the copier's name.
 *
 * Answer options get fresh negative ids: they are new rows too, and a positive id would read as
 * "already saved" to the forms. See docs/quiz/quiz-editing.md, "Editing a saved question".
 */
export const toEditableCopy = (question: AnyQuestion, id: number): NewAnyQuestion => {
  const base = {
    id,
    text: question.text,
    visibility: "Private",
    difficultyId: question.difficulty.id,
    categoryId: question.category.id,
    languageId: question.language.id,
    imageUrl: question.imageUrl ?? "",
    explanation: question.explanation ?? undefined,
  };

  switch (question.type) {
    case QuestionType.MultipleChoice:
      return {
        ...base,
        type: QuestionType.MultipleChoice,
        answerOptions: question.answerOptions.map((o, i) => ({
          id: -(i + 1),
          text: o.text,
          isCorrect: o.isCorrect,
        })),
        allowMultipleSelections: question.allowMultipleSelections,
      };
    case QuestionType.TrueFalse:
      return { ...base, type: QuestionType.TrueFalse, correctAnswer: question.correctAnswer };
    case QuestionType.TypeTheAnswer:
      return {
        ...base,
        type: QuestionType.TypeTheAnswer,
        correctAnswer: question.correctAnswer,
        isCaseSensitive: question.isCaseSensitive,
        allowPartialMatch: question.allowPartialMatch,
        acceptableAnswers: (question.acceptableAnswers ?? []).map((value) => ({ value })),
      };
  }
};
