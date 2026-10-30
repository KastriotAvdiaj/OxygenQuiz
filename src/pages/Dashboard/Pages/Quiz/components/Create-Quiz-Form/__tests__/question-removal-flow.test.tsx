import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuestionType, type AnyQuestion } from "@/types/question-types";
import { QuizQuestionProvider, useQuiz } from "../Quiz-questions-context";

/**
 * The provider's whole remove / undo / copy flow through its own dialogs — every place in the
 * builder that removes or copies a question calls these same functions. The two server reads it
 * makes (settings, editability) are stubbed: what they decide is pinned here, how the server
 * decides is pinned in the backend's QuestionEditRuleTests.
 */

const settingsState = { askBeforeRemovingQuestion: true };
const updateSettings = vi.fn();

vi.mock("@/pages/UserRelated/SettingsPage/api/get-settings", () => ({
  useSettingsData: () => ({ data: { ...settingsState } }),
}));
vi.mock("@/pages/UserRelated/SettingsPage/api/update-settings", () => ({
  useUpdateSettings: () => ({ mutate: updateSettings }),
}));
vi.mock("../../../../Question/api/get-question-editability", () => ({
  useQuestionEditability: () => ({ data: [] }),
}));

const savedQuestion = (id: number, text: string) =>
  ({
    id,
    text,
    visibility: "Public",
    difficulty: { id: 1, level: "Easy", weight: 1, createdAt: "" },
    category: { id: 1, name: "History", emoji: "" },
    language: { id: 1, language: "English", createdAt: "" },
    media: null,
    createdAt: "",
    user: { id: "u", username: "u" },
    type: QuestionType.TrueFalse,
    correctAnswer: true,
  }) as unknown as AnyQuestion;

const settings = { pointSystem: "Standard", timeLimitInSeconds: 10, orderInQuiz: 0 };

const Harness = () => {
  const { addedQuestions, requestRemoveQuestion, undoLastRemoval, removalCount, requestEditCopy } =
    useQuiz();
  return (
    <div>
      <ol aria-label="questions">
        {addedQuestions.map((q) => (
          <li key={q.id} data-id={q.id}>
            {q.text}
            <button onClick={() => requestRemoveQuestion(q.id)}>remove {q.text}</button>
            <button onClick={() => requestEditCopy(q.id)}>copy {q.text}</button>
          </li>
        ))}
      </ol>
      <button onClick={undoLastRemoval}>undo ({removalCount})</button>
    </div>
  );
};

const renderBuilder = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuizQuestionProvider
        initialQuestions={["A", "B", "C"].map((t, i) => ({
          question: savedQuestion(i + 1, t),
          settings: { ...settings, orderInQuiz: i },
        }))}
      >
        <Harness />
      </QuizQuestionProvider>
    </QueryClientProvider>,
  );

const texts = () =>
  within(screen.getByRole("list", { name: "questions" }))
    .getAllByRole("listitem")
    .map((li) => li.firstChild?.textContent);

const confirm = async (title: string, button: string) => {
  await screen.findByText(title);
  fireEvent.click(screen.getByRole("button", { name: button }));
  await waitFor(() => expect(screen.queryByText(title)).not.toBeInTheDocument());
};

beforeEach(() => {
  settingsState.askBeforeRemovingQuestion = true;
  updateSettings.mockReset();
});

describe("removing questions from the quiz builder", () => {
  it("asks first, and Cancel keeps the question", async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "remove B" }));
    await confirm("Remove question 2?", "Cancel");
    expect(texts()).toEqual(["A", "B", "C"]);
  });

  it("undoes several removals one at a time, each back to its place", async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "remove B" }));
    await confirm("Remove question 2?", "Remove");
    fireEvent.click(screen.getByRole("button", { name: "remove A" }));
    await confirm("Remove question 1?", "Remove");
    expect(texts()).toEqual(["C"]);

    fireEvent.click(screen.getByRole("button", { name: "undo (2)" }));
    expect(texts()).toEqual(["A", "C"]);
    fireEvent.click(screen.getByRole("button", { name: "undo (1)" }));
    expect(texts()).toEqual(["A", "B", "C"]);
  });

  it("'Don't ask again' turns the setting off", async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "remove B" }));
    await screen.findByText("Remove question 2?");
    fireEvent.click(screen.getByRole("checkbox", { name: "Don't ask again" }));
    await confirm("Remove question 2?", "Remove");

    expect(texts()).toEqual(["A", "C"]);
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ askBeforeRemovingQuestion: false }),
      expect.anything(),
    );
  });

  it("with the setting off, removes at once — and Undo still works", () => {
    settingsState.askBeforeRemovingQuestion = false;
    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "remove B" }));
    expect(screen.queryByText("Remove question 2?")).not.toBeInTheDocument();
    expect(texts()).toEqual(["A", "C"]);
    fireEvent.click(screen.getByRole("button", { name: "undo (1)" }));
    expect(texts()).toEqual(["A", "B", "C"]);
  });
});

describe("editing a saved question as a copy", () => {
  it("swaps it, after asking, for a draft copy in the same place", async () => {
    const { container } = renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "copy B" }));
    await confirm("Edit a copy of question 2?", "Edit a copy");

    expect(texts()).toEqual(["A", "B", "C"]);
    const ids = [...container.querySelectorAll("li")].map((li) => Number(li.dataset.id));
    expect(ids[0]).toBe(1);
    expect(ids[1]).toBeLessThan(0); // a draft now — created as a new question on save
    expect(ids[2]).toBe(3);
  });
});
