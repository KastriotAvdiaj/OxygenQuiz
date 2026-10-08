import type { QuizSummaryDTO } from "@/types/quiz-types";

/**
 * The fixed shape of the quiz home page (docs/quiz/featured-quizzes.md): four category panels,
 * each a ladder of four featured quizzes from Easy to Expert.
 *
 * The page is laid out from this list, not from whatever the API returns, so it looks the same
 * on every database. The API only fills the slots: a quiz is placed by its `featuredKey`
 * (`<slug>-<level>`, matching `Seed/featured-quizzes.json`), a slot with no quiz is left out,
 * and a panel with no quizzes at all is left out too.
 */

export type FeaturedLevel = "easy" | "medium" | "hard" | "expert";

export const FEATURED_LEVELS: readonly { level: FeaturedLevel; label: string; rank: number }[] = [
  { level: "easy", label: "Easy", rank: 1 },
  { level: "medium", label: "Medium", rank: 2 },
  { level: "hard", label: "Hard", rank: 3 },
  { level: "expert", label: "Expert", rank: 4 },
];

export type CategoryPanelSpec = {
  slug: string;
  /** Shown in 3D letters on the panel. */
  name: string;
  /**
   * Used only until the quizzes have loaded or if their category has no palette. Normally the
   * panel takes its colour from the category itself, so an admin's palette change shows here too.
   * Matches the seeded palette (FeaturedQuizSeeder.Categories).
   */
  fallbackPalette: [string, string];
};

export const CATEGORY_PANELS: readonly CategoryPanelSpec[] = [
  {
    slug: "geography",
    name: "Geography",
    fallbackPalette: ["#0B5CA8", "#CFE3F5"],
  },
  {
    slug: "general-knowledge",
    name: "General Knowledge",
    fallbackPalette: ["#8E3B2F", "#F2D6CF"],
  },
  {
    slug: "science",
    name: "Science",
    fallbackPalette: ["#4652C8", "#DCDFFA"],
  },
  {
    slug: "history",
    name: "History",
    fallbackPalette: ["#8E5326", "#F5E1C8"],
  },
];

export type FeaturedSlot = { level: (typeof FEATURED_LEVELS)[number]; quiz: QuizSummaryDTO };

export type FilledPanel = { panel: CategoryPanelSpec; slots: FeaturedSlot[] };

export const featuredKey = (slug: string, level: FeaturedLevel) => `${slug}-${level}`;

/** Places each featured quiz in its panel and slot; drops empty slots and empty panels. */
export function fillPanels(quizzes: readonly QuizSummaryDTO[]): FilledPanel[] {
  const byKey = new Map(
    quizzes.filter((q) => q.featuredKey).map((q) => [q.featuredKey as string, q])
  );

  return CATEGORY_PANELS.map((panel) => ({
    panel,
    slots: FEATURED_LEVELS.flatMap((level) => {
      const quiz = byKey.get(featuredKey(panel.slug, level.level));
      return quiz ? [{ level, quiz }] : [];
    }),
  })).filter((p) => p.slots.length > 0);
}
