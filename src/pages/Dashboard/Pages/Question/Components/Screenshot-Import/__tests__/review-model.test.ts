import { describe, expect, it } from "vitest";

import { QuestionType } from "@/types/question-types";
import { UnspecifiedIds } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/constants";
import { isSavable, rowProblems, toCreateRequest, toReviewRow, typesFor } from "../review-model";
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

  it("can never keep a picture-is-the-question row", () => {
    const row = toReviewRow(q({ needsItsPicture: true }), 1, 0);
    expect(row.keep).toBe(false);
    expect(isSavable({ ...row, keep: true })).toBe(false);
    expect(rowProblems(row)).toEqual(["Needs its picture — not supported yet"]);
  });

  it("asks for the category and language the model couldn't match", () => {
    const row = toReviewRow(q({ categoryId: null, languageId: null }), 1, 0);
    expect(rowProblems(row)).toEqual(["Choose a category", "Choose a language"]);
    expect(isSavable(row)).toBe(false);
  });

  it("lets true/false stay true/false, and swaps the other two freely", () => {
    expect(typesFor({ seenType: QuestionType.TrueFalse })).toEqual([QuestionType.TrueFalse]);
    expect(typesFor({ seenType: QuestionType.TypeTheAnswer })).toEqual([
      QuestionType.MultipleChoice,
      QuestionType.TypeTheAnswer,
    ]);
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
