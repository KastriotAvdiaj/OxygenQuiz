import type { FilterQuery, FilterRule } from "@/lib/filtering";
import { searchQuizzesQueryOptions } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";
import { DEFAULT_SORT, SORT_RULES, type SortOption } from "./components/quiz-sort";
import type { CatalogueChoice } from "./components/catalogue-scope-switch";

/**
 * The quiz catalogue's (`/choose-quiz`) one query, built in one place.
 *
 * Both the page and its route loader (`loaders/quiz-selection.loader.tsx`) call
 * `catalogueQueryOptions`, so the loader warms exactly the cache entry the page reads. The
 * loader used to warm a *different* endpoint (`/quiz/public`) the page never read: navigation
 * waited for a request whose result was thrown away, and the page then fetched cold anyway
 * (docs/development/loading-states.md §6).
 */

/** Quiz cards per page. */
export const CATALOGUE_PAGE_SIZE = 12;

/** Picked quizzes are the main catalogue (docs/media/moderation.md). */
export const DEFAULT_CATALOGUE: CatalogueChoice = "picked";

export type CatalogueQueryState = {
  page: number;
  search?: string;
  sortBy: SortOption;
  filters: FilterRule[];
  catalogue: CatalogueChoice;
};

/** What the page asks for on first render with no URL params. */
export const INITIAL_CATALOGUE_STATE: CatalogueQueryState = {
  page: 1,
  sortBy: DEFAULT_SORT,
  filters: [],
  catalogue: DEFAULT_CATALOGUE,
};

export const buildCatalogueQuery = ({
  page,
  search,
  sortBy,
  filters,
}: CatalogueQueryState): FilterQuery => ({
  page,
  pageSize: CATALOGUE_PAGE_SIZE,
  search: search || undefined,
  sort: [SORT_RULES[sortBy]],
  filters,
});

export const catalogueQueryOptions = (state: CatalogueQueryState) =>
  searchQuizzesQueryOptions("public", buildCatalogueQuery(state), state.catalogue);
