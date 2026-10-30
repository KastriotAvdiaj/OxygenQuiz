import { describe, expect, it } from "vitest";

import type { Quiz } from "@/types/quiz-types";

import { sharedQuizToSummary } from "../get-shared-quiz";

/**
 * A share link opens the same start dialog as the catalogue, which colours itself from the
 * category's palette (`parseQuizPalette(quiz.colorPaletteJson)`). The converter used to drop the
 * palette, so every shared quiz opened in the default indigo whatever its category.
 * docs/quiz/quiz-visibility.md, "Unlisted via share link".
 */
const HISTORY_PALETTE = '["#8b5a2b","#c08552","#f3e9dc"]';

const quiz = (category: Record<string, unknown>): Quiz =>
  ({
    id: 7,
    title: "Historia Shqipetare",
    user: { id: "u", username: "admin" },
    category,
    language: { id: 1, language: "Albanian" },
    difficulty: { id: 3, level: "Hard", weight: 3 },
    timeLimitInSeconds: 420,
    showFeedbackImmediately: true,
    status: "Unlisted",
    format: "Classic",
    shuffleQuestions: false,
    createdAt: "2026-10-03T00:00:00Z",
    version: 1,
    questionCount: 16,
    questions: [],
  }) as unknown as Quiz;

describe("sharedQuizToSummary", () => {
  it("keeps the category's palette, so the dialog wears the category's colours", () => {
    const summary = sharedQuizToSummary(
      quiz({ id: 2, name: "History", colorPaletteJson: HISTORY_PALETTE, gradient: true }),
    );

    expect(summary.colorPaletteJson).toBe(HISTORY_PALETTE);
    expect(summary.gradient).toBe(true);
  });

  it("leaves the palette unset when the category has none, so the default applies", () => {
    const summary = sharedQuizToSummary(quiz({ id: 2, name: "History" }));

    expect(summary.colorPaletteJson).toBeUndefined();
    expect(summary.gradient).toBe(false);
  });
});
