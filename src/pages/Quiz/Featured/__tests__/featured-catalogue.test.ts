import type { QuizSummaryDTO } from "@/types/quiz-types";
import { fillPanels } from "../featured-catalogue";

const quiz = (featuredKey: string | null, id = Math.floor(Math.random() * 1e6)): QuizSummaryDTO => ({
  id,
  title: featuredKey ?? "other",
  category: "x",
  difficulty: "x",
  language: "English",
  gradient: false,
  timeLimitInSeconds: 0,
  status: "Public",
  format: "Classic",
  createdAt: "2026-10-07",
  questionCount: 10,
  user: "OxygenQuiz",
  featuredKey,
});

// The page is laid out from the fixed catalogue; the API only fills its slots
// (docs/quiz/featured-quizzes.md, "What the page shows when a quiz is missing").
describe("fillPanels", () => {
  test("places each quiz in its panel, ladder order, whatever order the API used", () => {
    const panels = fillPanels([quiz("science-expert"), quiz("science-easy"), quiz("science-hard"), quiz("science-medium")]);
    expect(panels.map((p) => p.panel.slug)).toEqual(["science"]);
    expect(panels[0].slots.map((s) => s.level.level)).toEqual(["easy", "medium", "hard", "expert"]);
  });

  test("keeps the panel order fixed: Geography, General Knowledge, Science, History", () => {
    const panels = fillPanels([quiz("history-easy"), quiz("geography-easy"), quiz("science-easy"), quiz("general-knowledge-easy")]);
    expect(panels.map((p) => p.panel.name)).toEqual(["Geography", "General Knowledge", "Science", "History"]);
  });

  test("leaves out a missing slot rather than drawing an empty tile", () => {
    const [panel] = fillPanels([quiz("history-easy"), quiz("history-expert")]);
    expect(panel.slots.map((s) => s.level.label)).toEqual(["Easy", "Expert"]);
  });

  test("leaves out a panel with no quizzes at all", () => {
    expect(fillPanels([quiz("geography-hard")]).map((p) => p.panel.slug)).toEqual(["geography"]);
    expect(fillPanels([])).toEqual([]);
  });

  test("ignores quizzes that aren't featured, or name a slot that doesn't exist", () => {
    expect(fillPanels([quiz(null), quiz("cooking-easy"), quiz("geography-legendary")])).toEqual([]);
  });
});
