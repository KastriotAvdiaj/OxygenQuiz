import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {
  PaginatedMultipleChoiceQuestionResponse,
} from "@/types/ApiTypes";
import { AxiosResponse } from "axios";
import { cleanQueryParams, extractPaginationFromHeaders } from "@/lib/pagination-query";

export type GetMultipleChoiceQuestionsParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
  visibility?: string;
  userId?: string;
};

export const getMultipleChoiceQuestions = async (
  params: GetMultipleChoiceQuestionsParams
): Promise<PaginatedMultipleChoiceQuestionResponse> => {
  const cleanParams = cleanQueryParams(params);
  const queryString = new URLSearchParams(cleanParams).toString();
  const result: AxiosResponse = await api.get(
    `/questions/multiplechoice?${queryString}`
  );
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  };
};

export const getMultipleChoiceQuestionsQueryOptions = (
  params: GetMultipleChoiceQuestionsParams = {}
) => {
  return queryOptions({
    queryKey: ["multipleChoiceQuestions", params],
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