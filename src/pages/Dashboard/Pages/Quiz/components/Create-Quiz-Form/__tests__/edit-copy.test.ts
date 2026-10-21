import { describe, expect, it } from "vitest";
import { QuestionType, type AnyQuestion } from "@/types/question-types";
import { toEditableCopy } from "../edit-copy";

const saved = {
  text: "Capital of Kosovo?",
  visibility: "Public",
  difficulty: { id: 3, level: "Hard", weight: 3, createdAt: "" },
  category: { id: 7, name: "Geography", emoji: "" },
  language: { id: 2, language: "English", createdAt: "" },
  imageUrl: "https://img/x.png",
  explanation: "Since 2008.",
  createdAt: "",
  user: { id: "u", username: "someone" },
};

describe("toEditableCopy", () => {
  it("copies a multiple choice question as a Private draft with fresh option ids", () => {
    const original = {
      ...saved,
      id: 42,
      type: QuestionType.MultipleChoice,
      answerOptions: [
        { id: 100, text: "Prizren", isCorrect: false },
        { id: 101, text: "Prishtina", isCorrect: true },
      ],
      allowMultipleSelections: false,
    } as unknown as AnyQuestion;

    expect(toEditableCopy(original, -5)).toEqual({
      id: -5,
      text: "Capital of Kosovo?",
      visibility: "Private",
      difficultyId: 3,
      categoryId: 7,
      languageId: 2,
      imageUrl: "https://img/x.png",
      explanation: "Since 2008.",
      type: QuestionType.MultipleChoice,
      answerOptions: [
        { id: -1, text: "Prizren", isCorrect: false },
        { id: -2, text: "Prishtina", isCorrect: true },
      ],
      allowMultipleSelections: false,
    });
  });

  it("turns accepted answers into the draft form's { value } rows", () => {
    const original = {
      ...saved,
      id: 43,
      type: QuestionType.TypeTheAnswer,
      correctAnswer: "Prishtina",
      isCaseSensitive: false,
      allowPartialMatch: true,
      acceptableAnswers: ["Pristina", "Priština"],
    } as unknown as AnyQuestion;

    const copy = toEditableCopy(original, -6);
    expect(copy.type).toBe(QuestionType.TypeTheAnswer);
    expect(copy).toMatchObject({
      correctAnswer: "Prishtina",
      allowPartialMatch: true,
      acceptableAnswers: [{ value: "Pristina" }, { value: "Priština" }],
    });
  });

  it("keeps a true/false answer and drops a missing explanation", () => {
    const original = {
      ...saved,
      explanation: null,
      id: 44,
      type: QuestionType.TrueFalse,
      correctAnswer: false,
    } as unknown as AnyQuestion;

    expect(toEditableCopy(original, -7)).toMatchObject({
      type: QuestionType.TrueFalse,
      correctAnswer: false,
      explanation: undefined,
    });
  });
});
