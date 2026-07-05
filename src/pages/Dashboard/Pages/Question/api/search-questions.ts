import { queryOptions, useQuery } from "@tanstack/react-query";
import { QueryConfig } from "@/lib/React-query";
import {
  fetchPaged,
  rule,
  sortBy,
  type FilterQuery,
  type PagedResponse,
} from "@/lib/filtering";
import type { QuestionBase } from "@/types/question-types";

// Reference data hook for the shared filtering framework (see docs/quiz/filtering.md).
// Follows the project's getX / getXQueryOptions / useXData convention, but the params
// are the generic FilterQuery instead of a hand-rolled per-endpoint param type.

export const searchQuestions = (
  query: FilterQuery
): Promise<PagedResponse<QuestionBase>> =>
  fetchPaged<QuestionBase>("/questions/search", query);

export const searchQuestionsQueryOptions = (query: FilterQuery = {}) =>
  queryOptions({
    queryKey: ["questions", "search", query],
    queryFn: () => searchQuestions(query),
  });

export const useSearchQuestions = ({
  query,
  queryConfig,
}: {
  query?: FilterQuery;
  queryConfig?: QueryConfig<typeof searchQuestionsQueryOptions>;
} = {}) =>
  useQuery({
    ...searchQuestionsQueryOptions(query),
    ...queryConfig,
  });

/**
 * Convenience for the headline use-case: "questions from a specific user within a
 * timeframe", newest first. Builds the FilterQuery from high-level args so callers
 * (or the docs) don't have to assemble rules by hand.
 *
 *   buildUserWithinTimeframeQuery({ userId, from: "2026-01-01", to: "2026-03-31", search: "capital" })
 */
export const buildUserWithinTimeframeQuery = (opts: {
  userId: string;
  from?: string; // ISO date
  to?: string; // ISO date
  search?: string;
  page?: number;
  pageSize?: number;
}): FilterQuery => {
  const filters = [rule.eq("userId", opts.userId)];
  if (opts.from && opts.to) filters.push(rule.between("createdAt", opts.from, opts.to));
  else if (opts.from) filters.push(rule.gte("createdAt", opts.from));
  else if (opts.to) filters.push(rule.lte("createdAt", opts.to));

  return {
    filters,
    search: opts.search,
    sort: [sortBy("createdAt", "desc")],
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? 20,
  };
};
