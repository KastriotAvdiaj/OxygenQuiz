import { queryOptions, useQuery } from "@tanstack/react-query";
import { QueryConfig } from "@/lib/React-query";
import { fetchPaged, type FilterQuery, type PagedResponse } from "@/lib/filtering";
import type { QuizSummaryDTO } from "@/types/quiz-types";

// Shared filtering framework for quizzes (see docs/filtering.md). Three scopes mirror the
// backend endpoints; each takes the same generic FilterQuery and returns a PagedResponse.
type QuizSearchScope = "public" | "mine" | "all";

const SCOPE_URL: Record<QuizSearchScope, string> = {
  public: "/quiz/search",
  mine: "/quiz/mine/search",
  all: "/quiz/all/search",
};

export const searchQuizzes = (
  scope: QuizSearchScope,
  query: FilterQuery
): Promise<PagedResponse<QuizSummaryDTO>> =>
  fetchPaged<QuizSummaryDTO>(SCOPE_URL[scope], query);

export const searchQuizzesQueryOptions = (
  scope: QuizSearchScope,
  query: FilterQuery = {}
) =>
  queryOptions({
    queryKey: ["quizzes", "search", scope, query],
    queryFn: () => searchQuizzes(scope, query),
  });

export const useSearchQuizzes = ({
  scope = "public",
  query,
  queryConfig,
}: {
  scope?: QuizSearchScope;
  query?: FilterQuery;
  queryConfig?: QueryConfig<typeof searchQuizzesQueryOptions>;
} = {}) =>
  useQuery({
    ...searchQuizzesQueryOptions(scope, query),
    ...queryConfig,
  });
