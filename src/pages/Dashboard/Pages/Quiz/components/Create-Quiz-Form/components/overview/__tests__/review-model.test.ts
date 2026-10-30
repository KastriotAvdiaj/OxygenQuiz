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

  it("shows a builder question's chosen media and a saved question's media alike", () => {
    const drafted: NewTrueFalseQuestion = {
      ...newBase,
      id: -5,
      type: QuestionType.TrueFalse,
      text: "Name this anthem",
      correctAnswer: true,
      media: { assetId: "8f7e3c1a-1111-4222-8333-444455556666", url: "https://media.test/a.mp3", kind: "Audio" },
    };
    expect(toQuestionReview(drafted)).toMatchObject({ mediaUrl: "https://media.test/a.mp3", mediaType: "Audio" });
  });

  it("treats no media and a blank explanation as none", () => {
    const q: NewTrueFalseQuestion = {
      ...newBase,
      id: -4,
      type: QuestionType.TrueFalse,
      text: "x",
      correctAnswer: true,
      media: null,
      explanation: "   ",
    };

    const review = toQuestionReview(q);
    expect(review.mediaUrl).toBeNull();
    expect(review.mediaType).toBeNull();
    expect(review.explanation).toBeNull();
  });
});
