import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import type {
  PaginatedTrueFalseQuestionResponse,
  QuestionType,
} from "@/types/question-types";
import { getDashboardFetcher } from "@/lib/api/dashboard";

export type GetTrueFalseQuestionsParams = {
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

export const getTrueFalseQuestions = async (
  params: GetTrueFalseQuestionsParams
): Promise<PaginatedTrueFalseQuestionResponse> => {
  const { url } = getDashboardFetcher("trueFalseQuestions");
  const cleanParams = cleanQueryParams(params as Record<string, unknown>);
  const queryString = new URLSearchParams(cleanParams).toString();
  const endpoint = queryString ? `${url}?${queryString}` : url;
  const response = await api.get<PaginatedTrueFalseQuestionResponse>(endpoint);
  const body = response.data;
  const pagination = body.pagination ?? extractPaginationFromHeaders(response) ?? undefined;

  return {
    ...body,
    pagination,
  };
};

export const trueFalseQuestionsQueryKey = ["trueFalseQuestions"] as const;

export const getTrueFalseQuestionsQueryOptions = (
  params: GetTrueFalseQuestionsParams = {}
) => {
  return queryOptions({
    queryKey: [
      ...trueFalseQuestionsQueryKey,
      params,
    ],
    queryFn: () => getTrueFalseQuestions(params),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

type UseTrueFalseQuestionOptions = {
  queryConfig?: QueryConfig<typeof getTrueFalseQuestionsQueryOptions>;
  params?: GetTrueFalseQuestionsParams;
};

export const useTrueFalseQuestionData = ({
  queryConfig,
  params,
}: UseTrueFalseQuestionOptions) => {
  return useQuery({
    ...getTrueFalseQuestionsQueryOptions(params),
    ...queryConfig,
  });
};
