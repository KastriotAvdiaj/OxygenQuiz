import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ExplanationField, ExplanationNote } from "../QuestionExplanation";
import {
  DEFAULT_ADVANCE_SECONDS,
  explanationReadingSeconds,
  explanationSchema,
  EXPLANATION_MAX_LENGTH,
} from "../question-explanation";

/**
 * The explanation is optional (docs/quiz/question-explanations.md), so both halves are built
 * around "none": the editor doesn't put an empty box on every card, and the note renders nothing
 * rather than an empty "why" for a question without one.
 */
describe("ExplanationField", () => {
  it("starts collapsed when there is no explanation", () => {
    render(<ExplanationField value="" onChange={vi.fn()} />);

    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /add an explanation/i }));
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("starts open when there already is one — the AI path, where the author must review it", () => {
    render(<ExplanationField value="Rome became the capital in 1871." onChange={vi.fn()} />);

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "Rome became the capital in 1871.",
    );
  });

  it("does not snap shut when the author clears it", () => {
    const { rerender } = render(<ExplanationField value="x" onChange={vi.fn()} />);
    rerender(<ExplanationField value="" onChange={vi.fn()} />);

    expect(screen.getByRole("textbox")).toBeTruthy();
  });
});

describe("ExplanationNote", () => {
  it.each([null, undefined, "", "   "])("renders nothing for %j", (explanation) => {
    const { container } = render(<ExplanationNote explanation={explanation} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the explanation", () => {
    render(<ExplanationNote explanation="Condensation turns vapour into liquid." />);
    expect(screen.getByText("Condensation turns vapour into liquid.")).toBeTruthy();
  });
});

describe("explanationSchema", () => {
  it("mirrors the API cap", () => {
    expect(explanationSchema.safeParse("a".repeat(EXPLANATION_MAX_LENGTH)).success).toBe(true);
    expect(explanationSchema.safeParse("a".repeat(EXPLANATION_MAX_LENGTH + 1)).success).toBe(false);
    expect(explanationSchema.safeParse(undefined).success).toBe(true);
    expect(explanationSchema.safeParse(null).success).toBe(true);
  });
});

describe("explanationReadingSeconds", () => {
  it("scales with the explanation's length", () => {
    const short = explanationReadingSeconds("Rome is the capital.", 10);
    const long = explanationReadingSeconds(
      "Condensation is when water vapour cools and turns back into liquid, which is how clouds and dew form.",
      10,
    );
    expect(long).toBeGreaterThan(short);
  });

  it("never waits past the server's allowance — that is the session deadline's reading slack", () => {
    expect(explanationReadingSeconds("word ".repeat(500), 10)).toBe(10);
    expect(explanationReadingSeconds("word ".repeat(500), 6)).toBe(6);
  });

  it("never waits less than the default countdown", () => {
    expect(explanationReadingSeconds("Yes.", 10)).toBe(DEFAULT_ADVANCE_SECONDS);
    // An allowance below the default is honoured as the default: the default is already covered
    // by the per-question buffer every question gets.
    expect(explanationReadingSeconds("word ".repeat(500), 1)).toBe(DEFAULT_ADVANCE_SECONDS);
  });
});
