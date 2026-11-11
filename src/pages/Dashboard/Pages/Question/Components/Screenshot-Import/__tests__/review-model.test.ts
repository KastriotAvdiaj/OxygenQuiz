import { describe, expect, it } from "vitest";

import { QuestionType } from "@/types/question-types";
import { UnspecifiedIds } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/constants";
import {
  isSavable,
  markRepeats,
  normalizeType,
  rowProblems,
  toCreateRequest,
  toReviewRow,
} from "../review-model";
import type { ScreenshotQuestion } from "../screenshot-import-api";

const q = (over: Partial<ScreenshotQuestion> = {}): ScreenshotQuestion => ({
  type: QuestionType.MultipleChoice,
  seenType: QuestionType.MultipleChoice,
  text: "What is the capital of Kosovo?",
  correctAnswer: "Prishtina",
  wrongOptions: ["Prizren", "Peja", "Gjakova"],
  acceptableAnswers: ["Pristina"],
  explanation: null,
  answerFromImage: true,
  optionsFromImage: true,
  needsItsPicture: false,
  imageQuery: null,
  categoryId: 2,
  difficultyId: null,
  languageId: 2,
  duplicateOfId: null,
  ...over,
});

describe("screenshot import review rows", () => {
  it("start kept and Public; a possible duplicate starts unticked", () => {
    expect(toReviewRow(q(), 1, 0)).toMatchObject({ keep: true, visibility: "Public" });
    expect(toReviewRow(q({ duplicateOfId: 412 }), 1, 0).keep).toBe(false);
  });

  it("keeps a picture-is-the-question row only once a picture is added", () => {
    const row = toReviewRow(q({ needsItsPicture: true }), 1, 0);
    expect(row.keep).toBe(false);
    expect(isSavable({ ...row, keep: true })).toBe(false);
    expect(rowProblems(row)).toEqual(["Add its picture"]);

    const media = { assetId: "a1", url: "https://x/y.webp", kind: "Image" } as unknown as NonNullable<typeof row.media>;
    const withPicture = { ...row, keep: true, media };
    expect(isSavable(withPicture)).toBe(true);
    expect(toCreateRequest(withPicture).data.mediaAssetId).toBe("a1");
  });

  it("asks for the category and language the model couldn't match", () => {
    const row = toReviewRow(q({ categoryId: null, languageId: null }), 1, 0);
    expect(rowProblems(row)).toEqual(["Choose a category", "Choose a language"]);
    expect(isSavable(row)).toBe(false);
  });

  it("reads a type sent by name or by number — a number left every type box empty", () => {
    expect(normalizeType("MultipleChoice")).toBe(QuestionType.MultipleChoice);
    expect(normalizeType(0)).toBe(QuestionType.MultipleChoice);
    expect(normalizeType(1)).toBe(QuestionType.TrueFalse);
    expect(normalizeType(2)).toBe(QuestionType.TypeTheAnswer);
    expect(toReviewRow(q({ type: 0 as never }), 1, 0).type).toBe(QuestionType.MultipleChoice);
  });

  it("asks for wrong options rather than switching away from multiple choice", () => {
    const row = toReviewRow(q({ wrongOptions: [] }), 1, 0);
    expect(row.type).toBe(QuestionType.MultipleChoice);
    expect(rowProblems(row)).toEqual(["Add wrong options"]);
  });

  it("a question turned true/false must be rewritten as a statement first", () => {
    const row = { ...toReviewRow(q(), 1, 0), type: QuestionType.TrueFalse };
    expect(rowProblems(row)).toEqual(["Rewrite it as a statement to judge true or false"]);

    const rewritten = { ...row, text: "Prishtina is the capital of Kosovo.", tfAnswer: "true" as const };
    expect(rowProblems(rewritten)).toEqual([]);
    expect(toCreateRequest(rewritten)).toMatchObject({
      type: QuestionType.TrueFalse,
      data: { text: "Prishtina is the capital of Kosovo.", correctAnswer: true },
    });
    // Switching back keeps the original answer.
    expect({ ...rewritten, type: QuestionType.MultipleChoice }.correctAnswer).toBe("Prishtina");
  });

  it("marks a question already read from an earlier image, and leaves it unticked", () => {
    const first = toReviewRow(q({ text: "The Mid-Atlantic Ridge runs through which country?" }), 3, 0);
    const [again] = markRepeats([first], [toReviewRow(q({ text: "the mid-atlantic ridge runs through which country" }), 4, 0)]);
    expect(again).toMatchObject({ alsoOnImage: 3, keep: false });

    const [other] = markRepeats([first], [toReviewRow(q({ text: "Where is Dubai?" }), 4, 1)]);
    expect(other).toMatchObject({ alsoOnImage: null, keep: true });
  });

  it("saves multiple choice as the answer plus the wrong options, difficulty Unspecified when unknown", () => {
    const request = toCreateRequest(toReviewRow(q(), 1, 0));
    expect(request.type).toBe(QuestionType.MultipleChoice);
    if (request.type !== QuestionType.MultipleChoice) return;
    expect(request.data.answerOptions).toEqual([
      { text: "Prishtina", isCorrect: true },
      { text: "Prizren", isCorrect: false },
      { text: "Peja", isCorrect: false },
      { text: "Gjakova", isCorrect: false },
    ]);
    expect(request.data.difficultyId).toBe(UnspecifiedIds.difficultyId);
    expect(request.data.visibility).toBe("Public");
  });

  it("switching to type-the-answer keeps the answer and its alternatives", () => {
    const row = { ...toReviewRow(q(), 1, 0), type: QuestionType.TypeTheAnswer };
    const request = toCreateRequest(row);
    expect(request).toMatchObject({
      type: QuestionType.TypeTheAnswer,
      data: { correctAnswer: "Prishtina", acceptableAnswers: [{ value: "Pristina" }] },
    });
  });

  it("saves true/false as a boolean", () => {
    const row = toReviewRow(
      q({ type: QuestionType.TrueFalse, seenType: QuestionType.TrueFalse, correctAnswer: "false", wrongOptions: [] }),
      1,
      0,
    );
    expect(toCreateRequest(row)).toMatchObject({ type: QuestionType.TrueFalse, data: { correctAnswer: false } });
  });
});
