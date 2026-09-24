import { quizSizeLabel } from "../card-model";

// A board has no questions, so the Classic "N questions" line would read "0 questions" on every
// Associations card. See docs/quiz/quiz-card.md.
describe("quizSizeLabel", () => {
  test("a Classic quiz shows its question count", () => {
    expect(quizSizeLabel({ format: "Classic", questionCount: 13 })).toEqual({
      count: 13,
      label: "questions",
    });
  });

  test("one question is singular", () => {
    expect(quizSizeLabel({ format: "Classic", questionCount: 1 })).toEqual({
      count: 1,
      label: "question",
    });
  });

  test("an Associations quiz shows no count — never '0 questions'", () => {
    expect(quizSizeLabel({ format: "Associations", questionCount: 0 })).toEqual({
      count: null,
      label: "Associations board",
    });
  });
});
