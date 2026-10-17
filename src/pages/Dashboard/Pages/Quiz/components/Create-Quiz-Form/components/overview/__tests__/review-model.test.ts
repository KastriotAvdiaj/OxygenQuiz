import { describe, expect, it } from "vitest";

import { QuestionType, type AnyQuestion } from "@/types/question-types";
import type {
  NewMultipleChoiceQuestion,
  NewTrueFalseQuestion,
  NewTypeTheAnswerQuestion,
} from "../../../types";
import { toQuestionReview } from "../review-model";

const newBase = {
  visibility: "Private",
  difficultyId: 1,
  categoryId: 1,
  languageId: 1,
};

describe("toQuestionReview", () => {
  it("keeps multiple choice options in order with their correctness", () => {
    const q: NewMultipleChoiceQuestion = {
      ...newBase,
      id: -1,
      type: QuestionType.MultipleChoice,
      text: "Capital of Kosovo?",
      answerOptions: [
        { text: "Prizren", isCorrect: false },
        { text: "Prishtina", isCorrect: true },
      ],
      allowMultipleSelections: false,
    };

    expect(toQuestionReview(q).answer).toEqual({
      kind: "options",
      options: [
        { text: "Prizren", isCorrect: false },
        { text: "Prishtina", isCorrect: true },
      ],
      multiSelect: false,
    });
  });

  it("draws true/false as two options with exactly the right one correct", () => {
    const q: NewTrueFalseQuestion = {
      ...newBase,
      id: -2,
      type: QuestionType.TrueFalse,
      text: "Water boils at 100°C at sea level.",
      correctAnswer: false,
    };

    const answer = toQuestionReview(q).answer;
    expect(answer).toEqual({
      kind: "options",
      options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ],
      multiSelect: false,
    });
  });

  it("reads acceptable answers from both shapes and drops blanks and repeats of the answer", () => {
    const fresh: NewTypeTheAnswerQuestion = {
      ...newBase,
      id: -3,
      type: QuestionType.TypeTheAnswer,
      text: "Chemical symbol for gold?",
      correctAnswer: "Au",
      isCaseSensitive: false,
      allowPartialMatch: false,
      acceptableAnswers: [{ value: "au" }, { value: " " }, { value: "Aurum" }, { value: "aurum" }],
    };
    const fromBank = {
      ...fresh,
      id: 7,
      acceptableAnswers: ["Aurum", "AU"],
    } as unknown as AnyQuestion;

    for (const q of [fresh, fromBank]) {
      const answer = toQuestionReview(q).answer;
      expect(answer.kind).toBe("typed");
      if (answer.kind !== "typed") return;
      expect(answer.correct).toBe("Au");
      expect(answer.alsoAccepted).toEqual(["Aurum"]);
    }
  });

  it("treats a blank image or explanation as none", () => {
    const q: NewTrueFalseQuestion = {
      ...newBase,
      id: -4,
      type: QuestionType.TrueFalse,
      text: "x",
      correctAnswer: true,
      imageUrl: "",
      explanation: "   ",
    };

    const review = toQuestionReview(q);
    expect(review.imageUrl).toBeNull();
    expect(review.explanation).toBeNull();
  });
});
