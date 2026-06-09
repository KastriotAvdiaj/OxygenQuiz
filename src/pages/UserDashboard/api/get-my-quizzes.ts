import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import { PaginatedQuizSummaryResponse } from "@/types/quiz-types";

// User-scoped quiz fetching. Hits /quiz/my, which derives the owner from the auth
// token on the server — the client never sends a userId.

export type GetMyQuizzesParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
  visibility?: string;
};

export const getMyQuizzes = async (
  params: GetMyQuizzesParams
): Promise<PaginatedQuizSummaryResponse> => {
  const queryString = new URLSearchParams(cleanQueryParams(params)).toString();
  const result: AxiosResponse = await api.get(`/quiz/my?${queryString}`);
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  };
};

export const getMyQuizzesQueryOptions = (params: GetMyQuizzesParams = {}) =>
  queryOptions({
    queryKey: ["myQuizzes", params],
    queryFn: () => getMyQuizzes(params),
  });

export const useMyQuizzesData = ({
  queryConfig,
  params,
}: {
  queryConfig?: QueryConfig<typeof getMyQuizzesQueryOptions>;
  params?: GetMyQuizzesParams;
}) =>
  useQuery({
    ...getMyQuizzesQueryOptions(params),
    ...queryConfig,
  });
