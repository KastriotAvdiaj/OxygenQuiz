import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import { cleanQueryParams, extractPaginationFromHeaders } from "@/lib/pagination-query";
import { PaginatedTypeTheAnswerQuestionResponse } from "@/types/question-types";

export type GetTypeTheAnswerQuestionsParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number | null;
  difficultyId?: number | null;
  languageId?: number | null;
  visibility?: string | null;
  userId?: string | null;
};

export const getTypeTheAnswerQuestions = async (
  params: GetTypeTheAnswerQuestionsParams
): Promise<PaginatedTypeTheAnswerQuestionResponse> => {
  const cleanParams = cleanQueryParams(params as Record<string, any>);
  const queryString = new URLSearchParams(cleanParams).toString();
  const result: AxiosResponse = await api.get(
    `/questions/typeTheAnswer?${queryString}`
  );
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  };
};

export const getTypeTheAnswerQuestionsQueryOptions = (
  params: GetTypeTheAnswerQuestionsParams = {}
) => {
  return queryOptions({
    queryKey: ["typeTheAnswerQuestions", params],
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