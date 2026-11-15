import type { QuestionCategory, QuestionDifficulty } from "@/types/question-types";

import { parseQuizPalette } from "../components/quiz-palette";
import type { QuickPlayCombo } from "./quick-play-api";

/**
 * Quick play's choices, worked out from what the server says exists
 * (docs/quiz/quick-play.md). Nothing here is offered unless a quiz stands behind it: a category
 * with no quiz has no tile, and a difficulty with no quiz in the chosen category has no button.
 */

export interface QuickPlayLevel {
  id: number;
  label: string;
  count: number;
}

export interface QuickPlayTile {
  /** A category id, or `"any"` for the tile that draws from every category. */
  id: number | "any";
  name: string;
  /** The category's own colour; the any-category tile has none and uses the theme's. */
  color?: string;
  count: number;
  /** The difficulties this tile has quizzes at, easiest first. */
  levels: QuickPlayLevel[];
}

const levelsOf = (combos: QuickPlayCombo[], difficulties: readonly QuestionDifficulty[]): QuickPlayLevel[] => {
  const counts = new Map<number, number>();
  for (const combo of combos) counts.set(combo.difficultyId, (counts.get(combo.difficultyId) ?? 0) + combo.count);
  return [...difficulties]
    .sort((a, b) => a.weight - b.weight)
    .filter((d) => counts.has(d.id))
    .map((d) => ({ id: d.id, label: d.level, count: counts.get(d.id)! }));
};

const total = (combos: QuickPlayCombo[]) => combos.reduce((sum, combo) => sum + combo.count, 0);

/**
 * The tiles: any-category first (when more than one category has quizzes — with one, it would be
 * the same choice twice), then the categories with the most quizzes first, ties by name.
 */
export const buildQuickPlayTiles = (
  combos: readonly QuickPlayCombo[],
  categories: readonly QuestionCategory[],
  difficulties: readonly QuestionDifficulty[],
): QuickPlayTile[] => {
  const live = combos.filter((combo) => combo.count > 0);
  const tiles = categories
    .map((category): QuickPlayTile => {
      const own = live.filter((combo) => combo.categoryId === category.id);
      return {
        id: category.id,
        name: category.name,
        color: parseQuizPalette(category.colorPaletteJson)[0],
        count: total(own),
        levels: levelsOf(own, difficulties),
      };
    })
    .filter((tile) => tile.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  if (tiles.length < 2) return tiles;
  // Only the categories with a tile: a quiz whose category row is gone can't be asked for by name.
  const shown = live.filter((combo) => tiles.some((tile) => tile.id === combo.categoryId));
  return [{ id: "any", name: "Surprise me", count: total(shown), levels: levelsOf(shown, difficulties) }, ...tiles];
};

// ── What this browser has already been handed ───────────────────────────────────────────────
// A guest has no sessions for the server to check, so the browser remembers. Signed-in players
// send it too; the server adds their sessions on top.

const SEEN_KEY = "oxygen.quick-play-seen";
/** The server reads at most this many (`QuickPlayController.MaxExcluded`); the newest are kept. */
export const MAX_SEEN = 200;

export const readSeenQuizzes = (): number[] => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
};

/** Pure, so it can be tested: the list with `quizId` moved to the end, capped. */
export const withSeenQuiz = (seen: readonly number[], quizId: number): number[] =>
  [...seen.filter((id) => id !== quizId), quizId].slice(-MAX_SEEN);

export const rememberSeenQuiz = (quizId: number) => {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(withSeenQuiz(readSeenQuizzes(), quizId)));
  } catch {
    // Private mode or storage off: this browser may be handed the same quiz again.
  }
};
