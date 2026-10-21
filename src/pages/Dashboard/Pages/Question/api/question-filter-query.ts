import { rule, type FilterQuery, type FilterRule, type SortRule } from "@/lib/filtering";

/**
 * The Questions page's filter inputs → the filtering framework's FilterQuery.
 *
 * Its own module (it used to sit inside QuestionsTabContent) so the route's prefetch builds the
 * first page's query with the same function the page does. A prefetch that warms a *nearly*
 * matching key fills the cache with something the page never reads
 * (docs/development/loading-states.md §6).
 */

/** Questions per page on the admin Questions page. */
export const QUESTIONS_PAGE_SIZE = 6;

// The filter inputs this tab understands. The page owns them; this component just maps
// them to the framework's FilterQuery. createdFrom/createdTo/userId/sort are optional, so
// callers that don't need them (quiz creator, user dashboard) pass the same shape as before.
export interface QuestionQueryParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  // Single-value (legacy callers: quiz creator, user dashboard) …
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
  // … or multi-value (admin filters). When an array is provided it wins.
  categoryIds?: number[];
  difficultyIds?: number[];
  languageIds?: number[];
  userId?: string;
  createdFrom?: string; // ISO date
  createdTo?: string; // ISO date
  sort?: SortRule[];
}

// Prefer the multi-value array; fall back to the single legacy value; else nothing.
const idsOf = (many?: number[], one?: number): number[] =>
  many && many.length > 0 ? many : one != null ? [one] : [];

// UI filter inputs → framework FilterQuery. One place, easy to read and extend.
// Multiple ids become an `in` rule (e.g. categoryId in 3,4); a date range becomes `between`.
export const toFilterQuery = (p: QuestionQueryParams): FilterQuery => {
  const filters: FilterRule[] = [];

  const categoryIds = idsOf(p.categoryIds, p.categoryId);
  const difficultyIds = idsOf(p.difficultyIds, p.difficultyId);
  const languageIds = idsOf(p.languageIds, p.languageId);

  if (categoryIds.length) filters.push(rule.in("categoryId", categoryIds));
  if (difficultyIds.length) filters.push(rule.in("difficultyId", difficultyIds));
  if (languageIds.length) filters.push(rule.in("languageId", languageIds));
  if (p.userId) filters.push(rule.eq("userId", p.userId));

  if (p.createdFrom && p.createdTo) filters.push(rule.between("createdAt", p.createdFrom, p.createdTo));
  else if (p.createdFrom) filters.push(rule.gte("createdAt", p.createdFrom));
  else if (p.createdTo) filters.push(rule.lte("createdAt", p.createdTo));

  return {
    page: p.pageNumber,
    pageSize: p.pageSize,
    search: p.searchTerm || undefined,
    filters,
    sort: p.sort,
  };
};

/** What the Questions page asks for before anyone touches a filter. */
export const initialQuestionQueryParams: QuestionQueryParams = {
  pageNumber: 1,
  pageSize: QUESTIONS_PAGE_SIZE,
  searchTerm: undefined,
  categoryIds: [],
  difficultyIds: [],
  languageIds: [],
  createdFrom: undefined,
  createdTo: undefined,
};
