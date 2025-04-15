import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { PaginatedQuestionResponse } from "@/types/ApiTypes";

type GetQuestionsParams = {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  category?: string | null;
};

export const getQuestions = (params: GetQuestionsParams): Promise<PaginatedQuestionResponse> => {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  return api.get(`/questions?${queryString}`);
};

export const getQuestionsQueryOptions = (params: GetQuestionsParams = {}) => {
  return queryOptions({
    queryKey: params? ["questions", params] : ["questions"],
    queryFn: () => getQuestions(params),
  });
};

type UseQuestionOptions = {
  queryConfig?: QueryConfig<typeof getQuestionsQueryOptions>;
  params?: GetQuestionsParams;
};

export const useQuestionData = ({ queryConfig, params }: UseQuestionOptions) => {
  return useQuery({
    ...getQuestionsQueryOptions(params),
    ...queryConfig,
  });
};

