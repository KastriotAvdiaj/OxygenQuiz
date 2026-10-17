import { QuestionType } from "@/types/question-types";
import { QuizQuestion } from "../../types";

/**
 * What a question card in the quiz overview shows, independent of where the question came from.
 *
 * The builder holds two shapes side by side: questions being written here (`NewAnyQuestion`,
 * negative ids) and questions picked from the bank (`AnyQuestion`). They disagree on small
 * things — a bank Type-the-Answer stores `acceptableAnswers` as strings, a new one as
 * `{ value }` rows — and the card shouldn't have to know. True/False is turned into two options
 * so the card draws it exactly like multiple choice, which is how a player meets it.
 */
export type ReviewAnswer =
  | {
      kind: "options";
      options: { text: string; isCorrect: boolean }[];
      /** More than one option may be correct — the player picks all that apply. */
      multiSelect: boolean;
    }
  | {
      kind: "typed";
      correct: string;
      /** Other accepted spellings, without blanks or repeats of `correct`. */
      alsoAccepted: string[];
      caseSensitive: boolean;
      partialMatch: boolean;
    };

export interface QuestionReview {
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  explanation: string | null;
  answer: ReviewAnswer;
}

const blankToNull = (value: string | null | undefined): string | null =>
  value && value.trim().length > 0 ? value : null;

export const toQuestionReview = (question: QuizQuestion): QuestionReview => {
  const base = {
    type: question.type,
    text: question.text,
    imageUrl: blankToNull(question.imageUrl),
    explanation: blankToNull(question.explanation),
  };

  switch (question.type) {
    case QuestionType.MultipleChoice:
      return {
        ...base,
        answer: {
          kind: "options",
          options: question.answerOptions.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect,
          })),
          multiSelect: question.allowMultipleSelections,
        },
      };

    case QuestionType.TrueFalse:
      return {
        ...base,
        answer: {
          kind: "options",
          options: [
            { text: "True", isCorrect: question.correctAnswer === true },
            { text: "False", isCorrect: question.correctAnswer === false },
          ],
          multiSelect: false,
        },
      };

    case QuestionType.TypeTheAnswer: {
      const accepted = (question.acceptableAnswers as Array<string | { value: string }>).map(
        (a) => (typeof a === "string" ? a : a.value),
      );
      const seen = new Set([question.correctAnswer.trim().toLowerCase()]);
      const alsoAccepted = accepted.filter((a) => {
        const key = a.trim().toLowerCase();
        if (key.length === 0 || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return {
        ...base,
        answer: {
          kind: "typed",
          correct: question.correctAnswer,
          alsoAccepted,
          caseSensitive: question.isCaseSensitive,
          partialMatch: question.allowPartialMatch,
        },
      };
    }
  }
};
