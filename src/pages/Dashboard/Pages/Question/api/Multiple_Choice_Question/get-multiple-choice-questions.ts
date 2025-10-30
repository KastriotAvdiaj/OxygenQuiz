import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import type {
  PaginatedMultipleChoiceQuestionResponse,
  QuestionType,
} from "@/types/question-types";
import { getDashboardFetcher } from "@/lib/api/dashboard";

export type GetMultipleChoiceQuestionsParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
  visibility?: string;
  userId?: string;
  type?: QuestionType;
};

export const getMultipleChoiceQuestions = async (
  params: GetMultipleChoiceQuestionsParams
): Promise<PaginatedMultipleChoiceQuestionResponse> => {
  const { url } = getDashboardFetcher("multipleChoiceQuestions");
  const cleanParams = cleanQueryParams(params as Record<string, unknown>);
  const queryString = new URLSearchParams(cleanParams).toString();
  const endpoint = queryString ? `${url}?${queryString}` : url;
  const response = await api.get<PaginatedMultipleChoiceQuestionResponse>(endpoint);
  const body = response.data;
  const pagination = body.pagination ?? extractPaginationFromHeaders(response) ?? undefined;

  return {
    ...body,
    pagination,
  };
};

export const multipleChoiceQuestionsQueryKey = [
  "multipleChoiceQuestions",
] as const;

export const getMultipleChoiceQuestionsQueryOptions = (
  params: GetMultipleChoiceQuestionsParams = {}
) => {
  return queryOptions({
    queryKey: [
      ...multipleChoiceQuestionsQueryKey,
      params,
    ],
    queryFn: () => getMultipleChoiceQuestions(params),
  });
};

type UseMultipleChoiceQuestionOptions = {
  queryConfig?: QueryConfig<typeof getMultipleChoiceQuestionsQueryOptions>;
  params?: GetMultipleChoiceQuestionsParams;
};

export const useMultipleChoiceQuestionData = ({
  queryConfig,
  params,
}: UseMultipleChoiceQuestionOptions) => {
  return useQuery({
    ...getMultipleChoiceQuestionsQueryOptions(params),
    ...queryConfig,
  });
};
