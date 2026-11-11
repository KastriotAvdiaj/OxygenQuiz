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

const BY_NUMBER = [QuestionType.MultipleChoice, QuestionType.TrueFalse, QuestionType.TypeTheAnswer];

/**
 * The API sends types by name since 2026-11-11; a number (its enum's position) left every row's
 * type box empty before that. Accept both, so an old API or a cached reply can't do it again.
 */
export const normalizeType = (value: unknown): QuestionType =>
  typeof value === "number"
    ? (BY_NUMBER[value] ?? QuestionType.TypeTheAnswer)
    : Object.values(QuestionType).includes(value as QuestionType)
      ? (value as QuestionType)
      : QuestionType.TypeTheAnswer;

/** Same wording, ignoring case, spacing and the closing mark — how "already in the list" is judged. */
export const sameWording = (a: string, b: string) => {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim().replace(/[?.!:]+$/, "");
  return norm(a) === norm(b);
};

export interface ReviewRow {
  key: string;
  /** Which image it came from (1-based), for the row's caption. */
  imageNumber: number;
  keep: boolean;
  type: QuestionType;
  seenType: QuestionType;
  text: string;
  /** As read — so a row switched to true/false can tell whether it was rewritten as a statement. */
  originalText: string;
  correctAnswer: string;
  /** True/false's answer, kept apart so switching type never loses the other answer. */
  tfAnswer: "true" | "false";
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
  /** The same question was already read from this earlier image in this import. */
  alsoOnImage: number | null;
  visibility: ReviewVisibility;
}

/** What a row starts as. A possible duplicate starts unticked; a picture-is-the-question row can't be ticked. */
export const toReviewRow = (q: ScreenshotQuestion, imageNumber: number, index: number): ReviewRow => {
  const seenType = normalizeType(q.seenType);
  return {
  key: `${imageNumber}-${index}`,
  imageNumber,
  keep: !q.needsItsPicture && q.duplicateOfId === null,
  type: normalizeType(q.type),
  seenType,
  text: q.text,
  originalText: q.text,
  correctAnswer: seenType === QuestionType.TrueFalse ? "" : q.correctAnswer,
  tfAnswer: seenType === QuestionType.TrueFalse && q.correctAnswer === "false" ? "false" : "true",
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
  alsoOnImage: null,
  visibility: "Public",
  };
};

/**
 * New rows against the ones already listed: a question already read from an earlier image is
 * marked *Also on image N* and starts unticked — the same screenshot sent twice, or one question
 * on two slides. Pure, so it's tested without the dialog.
 */
export const markRepeats = (existing: ReviewRow[], incoming: ReviewRow[]): ReviewRow[] => {
  const seen = [...existing];
  return incoming.map((row) => {
    const earlier = seen.find((r) => !r.needsItsPicture && sameWording(r.text, row.text));
    const marked = earlier ? { ...row, alsoOnImage: earlier.imageNumber, keep: false } : row;
    seen.push(marked);
    return marked;
  });
};

/**
 * Every row may be any type (proposal Q34). A question turned true/false needs rewriting as a
 * statement by the reviewer — the model never rewrites, it only copies.
 */
export const ALL_TYPES = [QuestionType.MultipleChoice, QuestionType.TrueFalse, QuestionType.TypeTheAnswer];

/** A row switched to true/false from a question, not yet rewritten as a statement. */
export const needsStatement = (row: ReviewRow) =>
  row.type === QuestionType.TrueFalse &&
  row.seenType !== QuestionType.TrueFalse &&
  sameWording(row.text, row.originalText);

/**
 * Why a ticked row can't be saved yet, in the words the row shows. Empty = ready. Mirrors the API's
 * rules (classification required, an answer to grade against); the API is still the gate.
 */
export const rowProblems = (row: ReviewRow): string[] => {
  if (row.needsItsPicture) return ["Needs its picture — not supported yet"];
  const problems: string[] = [];
  if (!row.text.trim()) problems.push("Write the question");
  if (needsStatement(row)) problems.push("Rewrite it as a statement to judge true or false");
  if (row.type !== QuestionType.TrueFalse && !row.correctAnswer.trim()) problems.push("Give the answer");
  if (row.type === QuestionType.MultipleChoice && row.wrongOptions.every((o) => !o.trim()))
    problems.push("Add wrong options");
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
      return { type: QuestionType.TrueFalse, data: { ...common, correctAnswer: row.tfAnswer === "true" } };
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
