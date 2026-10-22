import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { QuestionType, type AnyQuestion } from "@/types/question-types";
import { QuizQuestionProvider } from "../Quiz-questions-context";
import { BuilderQuestionEditor } from "../components/builder-question-editor";
import type { QuestionEditability } from "../../../../Question/api/get-question-editability";

/**
 * How the builder shows a saved question, by what the server's edit rule said about it
 * (QuestionEditRule): allowed → straight into the editor, no notice; refused → read-only under a
 * notice naming the reason, with "Edit for this quiz".
 */

let answer: QuestionEditability[] | undefined;
let failed = false;
vi.mock("../../../../Question/api/get-question-editability", () => ({
  useQuestionEditability: () => ({ data: answer, isError: failed }),
}));
vi.mock("@/pages/UserRelated/SettingsPage/api/get-settings", () => ({
  useSettingsData: () => ({ data: undefined }),
}));

const question = {
  id: 7,
  text: "Cleopatra lived closer to the Moon landing than to the pyramids.",
  visibility: "Private",
  difficulty: { id: 1, level: "Hard", weight: 3, createdAt: "" },
  category: { id: 1, name: "History", emoji: "" },
  language: { id: 1, language: "English", createdAt: "" },
  imageUrl: "",
  createdAt: "",
  user: { id: "me", username: "me" },
  type: QuestionType.TrueFalse,
  correctAnswer: true,
} as unknown as AnyQuestion;

const renderEditor = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <QuizQuestionProvider
          initialQuestions={[{ question, settings: { pointSystem: "Standard", timeLimitInSeconds: 10, orderInQuiz: 0 } }]}
        >
          <BuilderQuestionEditor question={question} />
        </QuizQuestionProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );

describe("BuilderQuestionEditor", () => {
  it("names the reason and offers a copy when the rule says no", () => {
    answer = [{ questionId: 7, canEditInPlace: false, reason: "UsedElsewhere", otherQuizCount: 2 }];
    renderEditor();
    expect(screen.getByText(/2 other quizzes use this question too/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit for this quiz/ })).toBeInTheDocument();
  });

  it("falls back to a copy, never a dead end, when the check fails", () => {
    answer = undefined;
    failed = true;
    renderEditor();
    expect(screen.getByText(/Couldn't check whether this question can be edited/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit for this quiz/ })).toBeInTheDocument();
    failed = false;
  });

  it("says it is checking while the server hasn't answered", () => {
    answer = undefined;
    renderEditor();
    expect(screen.getByRole("status")).toHaveTextContent(/Checking whether this question can be edited/);
    expect(screen.queryByRole("button", { name: /Edit for this quiz/ })).not.toBeInTheDocument();
  });

  it("opens straight in the editor, with no notice, when the rule allows it", () => {
    answer = [{ questionId: 7, canEditInPlace: true, reason: null, otherQuizCount: 0 }];
    renderEditor();
    expect(screen.queryByRole("button", { name: /Edit for this quiz/ })).not.toBeInTheDocument();
    // The editor's own field holds the question's text, ready to change.
    expect(screen.getByDisplayValue(/Cleopatra lived closer/)).toBeInTheDocument();
  });
});
