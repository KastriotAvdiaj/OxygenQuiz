import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import { PaginatedQuizSummaryResponse } from "@/types/quiz-types";

export type GetPublicQuizzesParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
};

export const getPublicQuizzes = async (
  params: GetPublicQuizzesParams,
): Promise<PaginatedQuizSummaryResponse> => {
  const cleanParams = cleanQueryParams(params);
  const queryString = new URLSearchParams(cleanParams).toString();
  const result: AxiosResponse = await api.get(`/quiz/public?${queryString}`);
  console.log("API Response:", result);
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  };
};

export const getPublicQuizzesQueryOptions = (
  params: GetPublicQuizzesParams = {},
) => {
  return queryOptions({
    queryKey: ["quizzes", "public", params],
    queryFn: () => getPublicQuizzes(params),
  });
};

type UsePublicQuizzesOptions = {
  queryConfig?: QueryConfig<typeof getPublicQuizzesQueryOptions>;
  params?: GetPublicQuizzesParams;
};

export const usePublicQuizzesData = ({
  queryConfig,
  params,
}: UsePublicQuizzesOptions) => {
  return useQuery({
    ...getPublicQuizzesQueryOptions(params),
    ...queryConfig,
  });
};
