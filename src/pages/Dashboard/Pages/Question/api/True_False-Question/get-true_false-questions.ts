import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { PaginatedQuestionResponse } from "@/types/ApiTypes";

type GetQuestionsParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number | null;
  difficultyId?: number | null;
  languageId?: number | null;
  visibility?: string | null;
  userId?:string | null;
};

export const getTrueFalseQuestions = (params: GetQuestionsParams): Promise<PaginatedQuestionResponse> => {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  return api.get(`/questions/typeTheAnswer?${queryString}`);
};

export const getTrueFalseQuestionsQueryOptions = (params: GetQuestionsParams = {}) => {
  return queryOptions({
    queryKey: params? ["questions", params] : ["questions"],
    queryFn: () => getTrueFalseQuestions(params),
  });
};

type UseTrueFalseQuestionOptions = {
  queryConfig?: QueryConfig<typeof getTrueFalseQuestionsQueryOptions>;
  params?: GetQuestionsParams;
};

export const useTrueFlaseQuestionData = ({ queryConfig, params }: UseTrueFalseQuestionOptions) => {
  return useQuery({
    ...getTrueFalseQuestionsQueryOptions(params),
    ...queryConfig,
  });
};

