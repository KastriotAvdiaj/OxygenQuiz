import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import type {
  PaginatedTypeTheAnswerQuestionResponse,
  QuestionType,
} from "@/types/question-types";
import { getDashboardFetcher } from "@/lib/api/dashboard";

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
  params: GetTypeTheAnswerQuestionsParams
): Promise<PaginatedTypeTheAnswerQuestionResponse> => {
  const { url } = getDashboardFetcher("typeTheAnswerQuestions");
  const cleanParams = cleanQueryParams(params as Record<string, unknown>);
  const queryString = new URLSearchParams(cleanParams).toString();
  const endpoint = queryString ? `${url}?${queryString}` : url;
  const response = await api.get<PaginatedTypeTheAnswerQuestionResponse>(endpoint);
  const body = response.data;
  const pagination = body.pagination ?? extractPaginationFromHeaders(response) ?? undefined;

  return {
    ...body,
    pagination,
  };
};

export const typeTheAnswerQuestionsQueryKey = [
  "typeTheAnswerQuestions",
] as const;

export const getTypeTheAnswerQuestionsQueryOptions = (
  params: GetTypeTheAnswerQuestionsParams = {}
) => {
  return queryOptions({
    queryKey: [
      ...typeTheAnswerQuestionsQueryKey,
      params,
    ],
    queryFn: () => getTypeTheAnswerQuestions(params),
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
  return useQuery({
    ...getTypeTheAnswerQuestionsQueryOptions(params),
    ...queryConfig,
  });
};
