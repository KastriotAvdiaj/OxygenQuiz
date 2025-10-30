import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import type {
  PaginatedTrueFalseQuestionResponse,
  QuestionType,
} from "@/types/question-types";
import { getDashboardFetcher } from "@/lib/api/dashboard";
import { useUser } from "@/lib/Auth";
import { ROLES } from "@/lib/authorization";

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
  params: GetTrueFalseQuestionsParams,
  role?: ROLES
): Promise<PaginatedTrueFalseQuestionResponse> => {
  const { url, params: additionalParams } = getDashboardFetcher(
    "trueFalseQuestions",
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

export const getTrueFalseQuestionsQueryOptions = (
  params: GetTrueFalseQuestionsParams = {},
  role?: ROLES
) => {
  return queryOptions({
    queryKey: ["trueFalseQuestions", params, role ?? "default"],
    queryFn: () => getTrueFalseQuestions(params, role),
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
  const { data: user } = useUser();
  const role = user?.role;

  return useQuery({
    ...getTrueFalseQuestionsQueryOptions(params, role),
    ...queryConfig,
  });
};
