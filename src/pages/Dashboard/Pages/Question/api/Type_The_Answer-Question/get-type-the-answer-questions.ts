import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { PaginatedQuestionResponse } from "@/types/ApiTypes";

type GetTypeTheAnswerQuestionsParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number | null;
  difficultyId?: number | null;
  languageId?: number | null;
  visibility?: string | null;
  userId?: string | null;
};

export const getTypeTheAnswerQuestions = (params: GetTypeTheAnswerQuestionsParams): Promise<PaginatedQuestionResponse> => {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  return api.get(`/questions/typeTheAnswer?${queryString}`);
};

export const getTypeTheAnswerQuestionsQueryOptions = (params: GetTypeTheAnswerQuestionsParams = {}) => {
  return queryOptions({
    queryKey: params ? ["typeTheAnswerQuestions", params] : ["typeTheAnswerQuestions"],
    queryFn: () => getTypeTheAnswerQuestions(params),
  });
};

type UseTypeTheAnswerQuestionOptions = {
  queryConfig?: QueryConfig<typeof getTypeTheAnswerQuestionsQueryOptions>;
  params?: GetTypeTheAnswerQuestionsParams;
};

export const useTypeTheAnswerQuestionData = ({ queryConfig, params }: UseTypeTheAnswerQuestionOptions = {}) => {
  return useQuery({
    ...getTypeTheAnswerQuestionsQueryOptions(params),
    ...queryConfig,
  });
};