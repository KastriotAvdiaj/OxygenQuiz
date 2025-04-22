import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { PaginatedQuestionResponse } from "@/types/ApiTypes";

type GetMultipleChoiceQuestionsParams = {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  category?: string | null;
};

export const getMultipleChoiceQuestions = (params: GetMultipleChoiceQuestionsParams): Promise<PaginatedQuestionResponse> => {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  return api.get(`/questions/multiplechoice?${queryString}`);
};

export const getMultipleChoiceQuestionsQueryOptions = (params: GetMultipleChoiceQuestionsParams = {}) => {
  return queryOptions({
    queryKey: params? ["multipleChoiceQuestions", params] : ["multipleChoiceQuestions"],
    queryFn: () => getMultipleChoiceQuestions(params),
  });
};

type UseMultipleChoiceQuestionOptions = {
  queryConfig?: QueryConfig<typeof getMultipleChoiceQuestionsQueryOptions>;
  params?: GetMultipleChoiceQuestionsParams;
};

export const useMultipleChoiceQuestionData = ({ queryConfig, params }: UseMultipleChoiceQuestionOptions) => {
  return useQuery({
    ...getMultipleChoiceQuestionsQueryOptions(params),
    ...queryConfig,
  });
};

