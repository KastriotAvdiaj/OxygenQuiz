import type { SortRule } from "@/lib/filtering";

/**
 * Sort options exposed to users. `variety` is a backend pseudo-sort that interleaves
 * categories (newest of each category first) so the catalogue's first page shows the
 * app's breadth — the default for both quiz pickers (see docs/quiz/quiz-discovery.md).
 * The rest map to fields the backend whitelists as sortable (QuizFilterFields.cs:
 * `createdAt` and `title`).
 *
 * Kept apart from `quiz-header.tsx` so a route loader can build the catalogue's query
 * without importing the toolbar's UI into the entry bundle (catalogue-query.ts).
 */
export type SortOption =
  | "variety"
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc";

/** The default sort for quiz pickers — mixed categories, newest of each first. */
export const DEFAULT_SORT: SortOption = "variety";

export const SORT_RULES: Record<SortOption, SortRule> = {
  variety: { field: "variety", direction: "desc" },
  newest: { field: "createdAt", direction: "desc" },
  oldest: { field: "createdAt", direction: "asc" },
  "title-asc": { field: "title", direction: "asc" },
  "title-desc": { field: "title", direction: "desc" },
};
