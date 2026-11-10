import { QuestionType } from "@/types/question-types";
import { UnspecifiedIds } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/constants";
import type { ScreenshotQuestion } from "./screenshot-import-api";
import type { CreateMultipleChoiceQuestionInput } from "../../api/Multiple_Choice_Question/create-multiple-choice-question";
import type { CreateQuestionInput as CreateTrueFalseQuestionInput } from "../../api/True_False-Question/create-true_false-question";
import type { CreateTypeTheAnswerQuestionInput } from "../../api/Type_The_Answer-Question/create-type-the-answer-question";

export type CreateRequest =
  | { type: QuestionType.TrueFalse; data: CreateTrueFalseQuestionInput }
  | { type: QuestionType.MultipleChoice; data: CreateMultipleChoiceQuestionInput }
  | { type: QuestionType.TypeTheAnswer; data: CreateTypeTheAnswerQuestionInput };

/**
 * Screenshot import's review list, as data (docs/quiz/screenshot-import.md, "Review"). Kept apart
 * from the components so the rules — what may be saved, and what a save sends — are tested
 * without rendering anything.
 */

export type ReviewVisibility = "Public" | "Private";

export interface ReviewRow {
  key: string;
  /** Which image it came from (1-based), for the row's caption. */
  imageNumber: number;
  keep: boolean;
  type: QuestionType;
  seenType: QuestionType;
  text: string;
  correctAnswer: string;
  /** Always three slots, so switching to multiple choice has somewhere to put them. */
  wrongOptions: [string, string, string];
  acceptableAnswers: string[];
  explanation: string;
  answerFromImage: boolean;
  optionsFromImage: boolean;
  needsItsPicture: boolean;
  imageQuery: string | null;
  categoryId: number | null;
  difficultyId: number | null;
  languageId: number | null;
  duplicateOfId: number | null;
  visibility: ReviewVisibility;
}

/** What a row starts as. A possible duplicate starts unticked; a picture-is-the-question row can't be ticked. */
export const toReviewRow = (q: ScreenshotQuestion, imageNumber: number, index: number): ReviewRow => ({
  key: `${imageNumber}-${index}`,
  imageNumber,
  keep: !q.needsItsPicture && q.duplicateOfId === null,
  type: q.type,
  seenType: q.seenType,
  text: q.text,
  correctAnswer: q.correctAnswer,
  wrongOptions: [q.wrongOptions[0] ?? "", q.wrongOptions[1] ?? "", q.wrongOptions[2] ?? ""],
  acceptableAnswers: q.acceptableAnswers,
  explanation: q.explanation ?? "",
  answerFromImage: q.answerFromImage,
  optionsFromImage: q.optionsFromImage,
  needsItsPicture: q.needsItsPicture,
  imageQuery: q.imageQuery,
  categoryId: q.categoryId,
  difficultyId: q.difficultyId,
  languageId: q.languageId,
  duplicateOfId: q.duplicateOfId,
  visibility: "Public",
});

/** The types a row may switch to: true/false stays true/false; the others swap freely. */
export const typesFor = (row: Pick<ReviewRow, "seenType">): QuestionType[] =>
  row.seenType === QuestionType.TrueFalse
    ? [QuestionType.TrueFalse]
    : [QuestionType.MultipleChoice, QuestionType.TypeTheAnswer];

/**
 * Why a ticked row can't be saved yet, in the words the row shows. Empty = ready. Mirrors the API's
 * rules (classification required, an answer to grade against); the API is still the gate.
 */
export const rowProblems = (row: ReviewRow): string[] => {
  if (row.needsItsPicture) return ["Needs its picture — not supported yet"];
  const problems: string[] = [];
  if (!row.text.trim()) problems.push("Write the question");
  if (!row.correctAnswer.trim()) problems.push("Give the answer");
  if (row.type === QuestionType.MultipleChoice && row.wrongOptions.every((o) => !o.trim()))
    problems.push("Give at least one wrong option");
  if (row.categoryId === null) problems.push("Choose a category");
  if (row.languageId === null) problems.push("Choose a language");
  return problems;
};

export const isSavable = (row: ReviewRow) => row.keep && rowProblems(row).length === 0;

/** The create call a row becomes. Difficulty may stay Unspecified; it's rated later. */
export const toCreateRequest = (row: ReviewRow): CreateRequest => {
  const common = {
    text: row.text.trim(),
    categoryId: row.categoryId!,
    languageId: row.languageId!,
    difficultyId: row.difficultyId ?? UnspecifiedIds.difficultyId,
    visibility: row.visibility,
    explanation: row.explanation.trim(),
    mediaAssetId: null,
  };
  switch (row.type) {
    case QuestionType.TrueFalse:
      return { type: QuestionType.TrueFalse, data: { ...common, correctAnswer: row.correctAnswer === "true" } };
    case QuestionType.MultipleChoice: {
      const wrong = row.wrongOptions.map((o) => o.trim()).filter(Boolean);
      return {
        type: QuestionType.MultipleChoice,
        data: {
          ...common,
          allowMultipleSelections: false,
          answerOptions: [
            { text: row.correctAnswer.trim(), isCorrect: true },
            ...wrong.map((text) => ({ text, isCorrect: false })),
          ],
        },
      };
    }
    default:
      return {
        type: QuestionType.TypeTheAnswer,
        data: {
          ...common,
          correctAnswer: row.correctAnswer.trim(),
          isCaseSensitive: false,
          allowPartialMatch: false,
          acceptableAnswers: row.acceptableAnswers.map((value) => ({ value })),
        },
      };
  }
};
