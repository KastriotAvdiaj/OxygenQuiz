import { selectionFrom } from "@/features/media/api/upload-media";
import { QuestionType, type AnyQuestion } from "@/types/question-types";
import type { NewAnyQuestion, QuizQuestion } from "./types";

/**
 * Turning a saved question into something the builder's editors can work on.
 *
 * The builder holds two shapes: **saved** (`AnyQuestion`, from the bank: lookups as objects) and
 * **draft** (`NewAnyQuestion`: lookups as ids). The editors only speak draft. A saved question is
 * drafted one of two ways, decided by `QuestionEditRule` on the server
 * (docs/quiz/quiz-editing.md, "Which questions the builder edits directly"; ADR 0031):
 *
 * - **In place** (`toInPlaceDraft`) — yours, used by no other quiz, never answered. The draft
 *   keeps the question's id, visibility and option ids; saving the quiz updates that row.
 * - **As a copy** (`toEditableCopy`) — everything else. A new negative id, Private, fresh option
 *   ids; saving creates a new question and points this quiz at it. The original is untouched.
 *
 * Shape, not id sign, says which is which: a saved question being edited in place keeps its
 * positive id but becomes draft-shaped.
 */

/** A question as it came from the bank, untouched. */
export const isSavedShape = (q: QuizQuestion): q is AnyQuestion =>
  "difficulty" in q && "category" in q;

/** Editable in the builder: written here, copied, or a saved one being edited in place. */
export const isDraftShape = (q: QuizQuestion): q is NewAnyQuestion => !isSavedShape(q);

/** Not saved anywhere yet — saving the quiz creates it. */
export const isUnsaved = (q: QuizQuestion): boolean => q.id < 0;

const toDraft = (
  question: AnyQuestion,
  { id, visibility, keepOptionIds }: { id: number; visibility: string; keepOptionIds: boolean },
): NewAnyQuestion => {
  const base = {
    id,
    text: question.text,
    visibility,
    difficultyId: question.difficulty.id,
    categoryId: question.category.id,
    languageId: question.language.id,
    // The copy points at the same stored file; reusing an image you already use is free.
    media: selectionFrom(question.mediaAssetId, question.mediaUrl, question.mediaType, question.mediaCredit, question.mediaCreditUrl),
    explanation: question.explanation ?? undefined,
  };

  switch (question.type) {
    case QuestionType.MultipleChoice:
      return {
        ...base,
        type: QuestionType.MultipleChoice,
        answerOptions: question.answerOptions.map((o, i) => ({
          // Kept for an in-place edit, so the server updates these rows instead of replacing them.
          id: keepOptionIds ? o.id : -(i + 1),
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

/**
 * A copy for this quiz only: new negative id, **Private** (copying someone's Public question must
 * not publish a duplicate under the copier's name), fresh option ids.
 */
export const toEditableCopy = (question: AnyQuestion, id: number): NewAnyQuestion =>
  toDraft(question, { id, visibility: "Private", keepOptionIds: false });

/** The same question, editable where it is: same id, same visibility, same option ids. */
export const toInPlaceDraft = (question: AnyQuestion): NewAnyQuestion =>
  toDraft(question, { id: question.id, visibility: question.visibility, keepOptionIds: true });

/**
 * Whether two drafts say the same thing. The editors write back as soon as they open, so an
 * in-place question becomes draft-shaped without anyone changing it; saving compares it with its
 * original and skips the update when nothing changed.
 */
export const sameContent = (a: NewAnyQuestion, b: NewAnyQuestion): boolean => {
  const common = (q: NewAnyQuestion) => [
    q.type,
    q.text.trim(),
    q.media?.assetId ?? "",
    (q.explanation ?? "").trim(),
    q.difficultyId,
    q.categoryId,
    q.languageId,
  ];
  const specific = (q: NewAnyQuestion): unknown[] => {
    switch (q.type) {
      case QuestionType.MultipleChoice:
        return [q.allowMultipleSelections, ...q.answerOptions.map((o) => `${o.isCorrect}:${o.text.trim()}`)];
      case QuestionType.TrueFalse:
        return [q.correctAnswer];
      case QuestionType.TypeTheAnswer:
        return [
          q.correctAnswer.trim(),
          q.isCaseSensitive,
          q.allowPartialMatch,
          ...q.acceptableAnswers.map((a) => a.value.trim()),
        ];
    }
  };
  const key = (q: NewAnyQuestion) => JSON.stringify([...common(q), ...specific(q)]);
  return key(a) === key(b);
};
