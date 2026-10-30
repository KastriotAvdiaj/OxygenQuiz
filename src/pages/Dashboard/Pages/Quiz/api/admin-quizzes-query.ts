import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";

/**
 * The admin Quizzes page's filter state → the filtering framework's FilterQuery.
 *
 * Its own module so the route's prefetch builds the first page's query with the same function the
 * page does — a prefetch that warms a *nearly* matching key fills the cache with something the
 * page never reads (docs/development/loading-states.md §6).
 */

/** Rows per page on the admin Quizzes page. */
export const ADMIN_QUIZZES_PAGE_SIZE = 10;

export type AdminQuizzesFilterState = {
  pageNumber: number;
  search?: string;
  categoryIds: number[];
  difficultyIds: number[];
  languageIds: number[];
  statuses: string[];
  authorIds: string[];
  createdFrom: string;
  createdTo: string;
  showDeleted: boolean;
};

export const buildAdminQuizzesQuery = (s: AdminQuizzesFilterState): FilterQuery => {
  const filters: FilterRule[] = [];
  if (s.categoryIds.length) filters.push(rule.in("categoryId", s.categoryIds));
  if (s.difficultyIds.length) filters.push(rule.in("difficultyId", s.difficultyIds));
  if (s.languageIds.length) filters.push(rule.in("languageId", s.languageIds));
  if (s.statuses.length) filters.push(rule.in("status", s.statuses));
  if (s.authorIds.length) filters.push(rule.in("userId", s.authorIds));
  if (s.createdFrom && s.createdTo) filters.push(rule.between("createdAt", s.createdFrom, s.createdTo));
  else if (s.createdFrom) filters.push(rule.gte("createdAt", s.createdFrom));
  else if (s.createdTo) filters.push(rule.lte("createdAt", s.createdTo));

  return {
    page: s.pageNumber,
    pageSize: ADMIN_QUIZZES_PAGE_SIZE,
    search: s.search || undefined,
    filters,
    includeDeleted: s.showDeleted,
  };
};

/** What the Quizzes page asks for before anyone touches a filter. */
export const initialAdminQuizzesFilterState: AdminQuizzesFilterState = {
  pageNumber: 1,
  search: undefined,
  categoryIds: [],
  difficultyIds: [],
  languageIds: [],
  statuses: [],
  authorIds: [],
  createdFrom: "",
  createdTo: "",
  showDeleted: false,
};
