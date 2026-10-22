import { describe, expect, it } from "vitest";
import { QuestionType, type AnyQuestion } from "@/types/question-types";
import { isDraftShape, isSavedShape, sameContent, toEditableCopy, toInPlaceDraft } from "../edit-copy";

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

describe("editing a saved question in place", () => {
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

  it("keeps the question's id, visibility and option ids", () => {
    const draft = toInPlaceDraft(original);
    expect(draft).toMatchObject({ id: 42, visibility: "Public", categoryId: 7 });
    expect(draft.type === QuestionType.MultipleChoice && draft.answerOptions.map((o) => o.id)).toEqual([100, 101]);
  });

  it("tells an opened question from a changed one", () => {
    const opened = toInPlaceDraft(original);
    expect(sameContent(opened, toInPlaceDraft(original))).toBe(true);
    expect(sameContent({ ...opened, text: "Capital of Kosovo? " }, opened)).toBe(true); // whitespace only
    expect(sameContent({ ...opened, text: "Largest city of Kosovo?" }, opened)).toBe(false);
  });

  it("decides saved vs draft by shape, not by id sign", () => {
    expect(isSavedShape(original)).toBe(true);
    expect(isDraftShape(toInPlaceDraft(original))).toBe(true); // positive id, draft-shaped
  });
});
