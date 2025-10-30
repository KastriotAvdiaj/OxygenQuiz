import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import type {
  PaginatedTypeTheAnswerQuestionResponse,
  QuestionType,
} from "@/types/question-types";
import { getDashboardFetcher } from "@/lib/api/dashboard";
import { useUser } from "@/lib/Auth";
import { ROLES } from "@/lib/authorization";

export type GetTypeTheAnswerQuestionsParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number | null;
  difficultyId?: number | null;
  languageId?: number | null;
  visibility?: string | null;
  userId?: string | null;
  type?: QuestionType;
};

export const getTypeTheAnswerQuestions = async (
  params: GetTypeTheAnswerQuestionsParams,
  role?: ROLES
): Promise<PaginatedTypeTheAnswerQuestionResponse> => {
  const { url, params: additionalParams } = getDashboardFetcher(
    "typeTheAnswerQuestions",
    role
  );
  const mergedParams = {
    ...params,
    ...(additionalParams ?? {}),
  };
  const cleanParams = cleanQueryParams(mergedParams as Record<string, any>);
  const queryString = new URLSearchParams(cleanParams).toString();
  const endpoint = queryString ? `${url}?${queryString}` : url;
  const result: AxiosResponse = await api.get(endpoint);
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  };
};

export const getTypeTheAnswerQuestionsQueryOptions = (
  params: GetTypeTheAnswerQuestionsParams = {},
  role?: ROLES
) => {
  return queryOptions({
    queryKey: ["typeTheAnswerQuestions", params, role ?? "default"],
    queryFn: () => getTypeTheAnswerQuestions(params, role),
  });
};

type UseTypeTheAnswerQuestionOptions = {
  queryConfig?: QueryConfig<typeof getTypeTheAnswerQuestionsQueryOptions>;
  params?: GetTypeTheAnswerQuestionsParams;
};

export const useTypeTheAnswerQuestionData = ({
  queryConfig,
  params,
}: UseTypeTheAnswerQuestionOptions) => {
  const { data: user } = useUser();
  const role = user?.role;

  return useQuery({
    ...getTypeTheAnswerQuestionsQueryOptions(params, role),
    ...queryConfig,
  });
};
