// src/pages/Quiz/Sessions/components/__tests__/question-display.test.tsx

import { render, screen } from "@testing-library/react";
import { QuestionDisplay } from "../quiz-taking-process/question-display";
import { QuestionType } from "@/types/question-types";
import { CurrentQuestion } from "../../quiz-session-types";

// Mock the TrueOrFalseQuestion component
jest.mock("../true-or-false-question", () => ({
  TrueOrFalseQuestion: () => (
    <div data-testid="true-false-question">True/False Question</div>
  ),
}));

// Mock the QuizTimer component
jest.mock("../quiz-timer", () => ({
  QuizTimer: () => <div data-testid="quiz-timer">Timer</div>,
}));

describe("QuestionDisplay", () => {
  const mockOnSubmit = jest.fn();
  const primaryColor = "#4f46e5";

  it("renders multiple choice question when questionType is MultipleChoice", () => {
    const multipleChoiceQuestion: CurrentQuestion = {
      quizQuestionId: 1,
      questionText: "What is React?",
      options: [
        { id: 1, text: "A JavaScript library" },
        { id: 2, text: "A programming language" },
      ],
      timeLimitInSeconds: 30,
      timeRemainingInSeconds: 30,
      questionType: QuestionType.MultipleChoice,
    };

    render(
      <QuestionDisplay
        question={multipleChoiceQuestion}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        primaryColor={primaryColor}
      />
    );

    expect(screen.getByText("What is React?")).toBeInTheDocument();
    expect(screen.getByText("A JavaScript library")).toBeInTheDocument();
    expect(screen.getByText("A programming language")).toBeInTheDocument();
    expect(screen.queryByTestId("true-false-question")).not.toBeInTheDocument();
  });

  it("renders TrueOrFalseQuestion when questionType is TrueFalse", () => {
    const trueFalseQuestion: CurrentQuestion = {
      quizQuestionId: 2,
      questionText: "Is React a JavaScript library?",
      options: [], // Empty for true/false questions
      timeLimitInSeconds: 30,
      timeRemainingInSeconds: 30,
      questionType: QuestionType.TrueFalse,
    };

    render(
      <QuestionDisplay
        question={trueFalseQuestion}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        primaryColor={primaryColor}
      />
    );

    expect(
      screen.getByText("Is React a JavaScript library?")
    ).toBeInTheDocument();
    expect(screen.getByTestId("true-false-question")).toBeInTheDocument();
  });

  it("defaults to multiple choice rendering when questionType is not specified", () => {
    const questionWithoutType: CurrentQuestion = {
      quizQuestionId: 3,
      questionText: "What is React?",
      options: [
        { id: 1, text: "A JavaScript library" },
        { id: 2, text: "A programming language" },
      ],
      timeLimitInSeconds: 30,
      timeRemainingInSeconds: 30,
      questionType: undefined as unknown as QuestionType, // Force undefined for test
    };

    render(
      <QuestionDisplay
        question={questionWithoutType}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        primaryColor={primaryColor}
      />
    );

    expect(screen.getByText("What is React?")).toBeInTheDocument();
    expect(screen.getByText("A JavaScript library")).toBeInTheDocument();
    expect(screen.queryByTestId("true-false-question")).not.toBeInTheDocument();
  });
});
