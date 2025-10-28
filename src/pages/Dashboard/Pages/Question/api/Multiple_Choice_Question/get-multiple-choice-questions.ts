import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import type {
  PaginatedMultipleChoiceQuestionResponse,
  QuestionType,
} from "@/types/question-types";
import { getDashboardFetcher } from "@/lib/api/dashboard";
import { useUser } from "@/lib/Auth";
import { ROLES } from "@/lib/authorization";

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
  params: GetMultipleChoiceQuestionsParams,
  role?: ROLES
): Promise<PaginatedMultipleChoiceQuestionResponse> => {
  const { url, params: additionalParams } = getDashboardFetcher(
    "multipleChoiceQuestions",
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

export const getMultipleChoiceQuestionsQueryOptions = (
  params: GetMultipleChoiceQuestionsParams = {},
  role?: ROLES
) => {
  return queryOptions({
    queryKey: ["multipleChoiceQuestions", params, role ?? "default"],
    queryFn: () => getMultipleChoiceQuestions(params, role),
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
  const { data: user } = useUser();
  const role = user?.role;

  return useQuery({
    ...getMultipleChoiceQuestionsQueryOptions(params, role),
    ...queryConfig,
  });
};
