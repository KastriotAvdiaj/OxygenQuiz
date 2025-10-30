import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import { PaginatedQuizSummaryResponse } from "@/types/quiz-types";
import { getDashboardFetcher } from "@/lib/api/dashboard";

export type GetAllQuizzesParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
  visibility?: string;
};

export const getAllQuizzes = async (
  params: GetAllQuizzesParams
): Promise<PaginatedQuizSummaryResponse> => {
  const { url } = getDashboardFetcher("quizzes");
  const cleanParams = cleanQueryParams(params as Record<string, unknown>);
  const queryString = new URLSearchParams(cleanParams).toString();
  const endpoint = queryString ? `${url}?${queryString}` : url;
  const response = await api.get<PaginatedQuizSummaryResponse>(endpoint);
  const body = response.data;
  const pagination = body.pagination ?? extractPaginationFromHeaders(response) ?? undefined;

  return {
    ...body,
    pagination,
  };
};

export const getAllQuizzesQueryOptions = (
  params: GetAllQuizzesParams = {}
) => {
  return queryOptions({
    queryKey: ["quiz", params],
    queryFn: () => getAllQuizzes(params),
  });
};

type UseAllQuizzesOptions = {
  queryConfig?: QueryConfig<typeof getAllQuizzesQueryOptions>;
  params?: GetAllQuizzesParams;
};

export const useAllQuizzesData = ({
  queryConfig,
  params,
}: UseAllQuizzesOptions) => {
  return useQuery({
    ...getAllQuizzesQueryOptions(params),
    ...queryConfig,
  });
};
