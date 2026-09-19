import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { QuestionDisplay } from "../question-display";
import { QuestionType } from "@/types/question-types";
import type { CurrentQuestion } from "@/types/quiz-session-types";
import { useNotifications } from "@/common/Notifications";

// The timer ticks audibly in its last seconds; jsdom has no audio stack and nothing here is
// about sound.
vi.mock("@/lib/audio", () => ({
  audio: { play: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() },
}));

/**
 * What a player can and cannot send to the server from one question.
 *
 * QuestionDisplay sits between the three question types and the session's submit call, and it
 * owns the two rules that matter for scoring: an answer is submitted **at most once**, and a
 * question that runs out of time submits a timeout rather than whatever happened to be selected.
 * Both are assertions on `onSubmit` — the one thing the server sees — rather than on markup.
 */

const question = (overrides: Partial<CurrentQuestion> = {}): CurrentQuestion => ({
  quizQuestionId: 1,
  questionText: "What is the capital of France?",
  options: [
    { id: 11, text: "Berlin" },
    { id: 12, text: "Paris" },
    { id: 13, text: "Madrid" },
  ],
  timeLimitInSeconds: 20,
  timeRemainingInSeconds: 20,
  questionType: QuestionType.MultipleChoice,
  ...overrides,
});

const renderQuestion = (q: CurrentQuestion) => {
  const onSubmit = vi.fn();
  render(<QuestionDisplay question={q} onSubmit={onSubmit} isSubmitting={false} />);
  return onSubmit;
};

const option = (text: string) => screen.getByRole("button", { name: text });
const submit = () => screen.getByRole("button", { name: "Submit" });

describe("QuestionDisplay", () => {
  beforeEach(() => {
    // Fake timers drive the countdown; Date.now() moves with them, which the timer relies on.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-18T12:00:00.000Z"));
    useNotifications.setState({ notifications: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps Submit disabled until an option is chosen, then submits that option", () => {
    const onSubmit = renderQuestion(question());

    expect(submit()).toHaveProperty("disabled", true);

    fireEvent.click(option("Paris"));
    fireEvent.click(submit());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(12, undefined);
  });

  it("submits only once, however the player tries to submit again", () => {
    const onSubmit = renderQuestion(question());

    // Clicking the selected option again is the "lock in" shortcut.
    fireEvent.click(option("Paris"));
    fireEvent.click(option("Paris"));
    // ...and then the button, while the request is still pending.
    fireEvent.click(submit());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(12, undefined);
  });

  it("sends every chosen id for a select-all-that-apply question", () => {
    const onSubmit = renderQuestion(question({ allowMultipleSelections: true }));

    fireEvent.click(option("Berlin"));
    fireEvent.click(option("Madrid"));
    // Toggling an option off removes it from the answer.
    fireEvent.click(option("Paris"));
    fireEvent.click(option("Paris"));
    fireEvent.click(submit());

    // Multi-select answers travel as a CSV of option ids on the text channel.
    expect(onSubmit).toHaveBeenCalledWith(null, "11,13");
  });

  it("submits a timeout, not the current selection, when time runs out", () => {
    const onSubmit = renderQuestion(question({ timeRemainingInSeconds: 3 }));

    // A selection that was never submitted must not be graded.
    fireEvent.click(option("Paris"));
    act(() => void vi.advanceTimersByTime(3500));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(null, undefined, true);
    expect(screen.getAllByText("Time's Up!").length).toBeGreaterThan(0);
    expect(option("Berlin")).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();
    expect(useNotifications.getState().notifications).toHaveLength(1);
  });

  it("does not also time out a question that was answered in time", () => {
    const onSubmit = renderQuestion(question({ timeRemainingInSeconds: 3 }));

    fireEvent.click(option("Paris"));
    fireEvent.click(submit());
    act(() => void vi.advanceTimersByTime(5000));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(12, undefined);
    expect(useNotifications.getState().notifications).toHaveLength(0);
  });

  it("trims a typed answer and submits it on Enter", () => {
    const onSubmit = renderQuestion(
      question({ questionType: QuestionType.TypeTheAnswer, options: [] }),
    );

    const input = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(input, { target: { value: "  Paris  " } });
    fireEvent.keyUp(input, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith(null, "Paris");
  });
});
