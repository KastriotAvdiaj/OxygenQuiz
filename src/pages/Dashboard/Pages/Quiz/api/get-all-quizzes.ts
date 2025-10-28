import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import { PaginatedQuizSummaryResponse } from "@/types/quiz-types";
import { getDashboardFetcher } from "@/lib/api/dashboard";
import { useUser } from "@/lib/Auth";
import { ROLES } from "@/lib/authorization";

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
  params: GetAllQuizzesParams,
  role?: ROLES
): Promise<PaginatedQuizSummaryResponse> => {
  const { url, params: additionalParams } = getDashboardFetcher(
    "quizzes",
    role
  );
  const mergedParams = {
    ...params,
    ...(additionalParams ?? {}),
  };
  const cleanParams = cleanQueryParams(mergedParams);
  const queryString = new URLSearchParams(cleanParams).toString();
  const endpoint = queryString ? `${url}?${queryString}` : url;
  const result: AxiosResponse = await api.get(endpoint);
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  };
};

export const getAllQuizzesQueryOptions = (
  params: GetAllQuizzesParams = {},
  role?: ROLES
) => {
  return queryOptions({
    queryKey: ["quiz", params, role ?? "default"],
    queryFn: () => getAllQuizzes(params, role),
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
  const { data: user } = useUser();
  const role = user?.role;

  return useQuery({
    ...getAllQuizzesQueryOptions(params, role),
    ...queryConfig,
  });
};
