import { queryOptions, useQuery } from "@tanstack/react-query";
import { QueryConfig } from "@/lib/React-query";
import { fetchPaged, type FilterQuery, type PagedResponse } from "@/lib/filtering";
import type { QuestionCategory } from "@/types/question-types";

// Categories over the shared filtering framework (see docs/quiz/filtering.md).
export const searchQuestionCategories = (
  query: FilterQuery
): Promise<PagedResponse<QuestionCategory>> =>
  fetchPaged<QuestionCategory>("/questioncategories/search", query);

export const searchQuestionCategoriesQueryOptions = (query: FilterQuery = {}) =>
  queryOptions({
    queryKey: ["questionCategories", "search", query],
    queryFn: () => searchQuestionCategories(query),
  });

export const useSearchQuestionCategories = ({
  query,
  queryConfig,
}: {
  query?: FilterQuery;
  queryConfig?: QueryConfig<typeof searchQuestionCategoriesQueryOptions>;
} = {}) =>
  useQuery({
    ...searchQuestionCategoriesQueryOptions(query),
    ...queryConfig,
  });
