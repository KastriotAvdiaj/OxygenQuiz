// src/pages/Quiz/Sessions/components/__tests__/true-or-false-question.test.tsx

import { render, screen, fireEvent } from "@testing-library/react";
import { TrueOrFalseQuestion } from "../true-or-false-question";
import { QuestionType } from "@/types/question-types";
import { CurrentQuestion } from "../../quiz-session-types";

describe("TrueOrFalseQuestion", () => {
  const mockQuestion: CurrentQuestion = {
    quizQuestionId: 1,
    questionText: "Is React a JavaScript library?",
    options: [], // We don't use these for True/False questions
    timeLimitInSeconds: 30,
    timeRemainingInSeconds: 30,
    questionType: QuestionType.TrueFalse,
  };

  const mockOnSubmit = jest.fn();
  const primaryColor = "#4f46e5";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders true and false buttons", () => {
    render(
      <TrueOrFalseQuestion
        question={mockQuestion}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        primaryColor={primaryColor}
      />
    );

    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
  });

  it("enables submit button only after selection", () => {
    render(
      <TrueOrFalseQuestion
        question={mockQuestion}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        primaryColor={primaryColor}
      />
    );

    const submitButton = screen.getByText("Submit Answer");
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByText("True"));
    expect(submitButton).not.toBeDisabled();
  });

  it("calls onSubmit with correct option ID when true is selected", () => {
    render(
      <TrueOrFalseQuestion
        question={mockQuestion}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        primaryColor={primaryColor}
      />
    );

    fireEvent.click(screen.getByText("True"));
    fireEvent.click(screen.getByText("Submit Answer"));

    expect(mockOnSubmit).toHaveBeenCalledWith(1); // 1 is the ID for True
  });

  it("calls onSubmit with correct option ID when false is selected", () => {
    render(
      <TrueOrFalseQuestion
        question={mockQuestion}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        primaryColor={primaryColor}
      />
    );

    fireEvent.click(screen.getByText("False"));
    fireEvent.click(screen.getByText("Submit Answer"));

    expect(mockOnSubmit).toHaveBeenCalledWith(0); // 0 is the ID for False
  });

  it("shows submitting text when isSubmitting is true", () => {
    render(
      <TrueOrFalseQuestion
        question={mockQuestion}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
        primaryColor={primaryColor}
      />
    );

    expect(screen.getByText("Submitting...")).toBeInTheDocument();
  });

  it("applies selected styling to the chosen option", () => {
    render(
      <TrueOrFalseQuestion
        question={mockQuestion}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        primaryColor={primaryColor}
      />
    );

    const trueButton = screen.getByText("True").closest("button");
    const falseButton = screen.getByText("False").closest("button");

    // Initially no selection styling
    expect(trueButton).toHaveStyle({ backgroundColor: "transparent" });
    expect(falseButton).toHaveStyle({ backgroundColor: "transparent" });

    // Click True and check styling
    fireEvent.click(trueButton!);
    expect(trueButton).toHaveStyle({ backgroundColor: `${primaryColor}25` });
    expect(falseButton).toHaveStyle({ backgroundColor: "transparent" });

    // Click False and check styling changes
    fireEvent.click(falseButton!);
    expect(trueButton).toHaveStyle({ backgroundColor: "transparent" });
    expect(falseButton).toHaveStyle({ backgroundColor: `${primaryColor}25` });
  });
});
