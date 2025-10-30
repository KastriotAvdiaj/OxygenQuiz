import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import { PaginatedQuizSummaryResponse } from "@/types/quiz-types";

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
  const cleanParams = cleanQueryParams(params);
  const queryString = new URLSearchParams(cleanParams).toString();
  const result: AxiosResponse = await api.get(`/quiz?${queryString}`);
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  };
};

export const getAllQuizzesQueryOptions = (params: GetAllQuizzesParams = {}) => {
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
