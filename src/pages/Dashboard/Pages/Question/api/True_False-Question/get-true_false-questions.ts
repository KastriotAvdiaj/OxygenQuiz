import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import type { PaginatedTrueFalseQuestionResponse } from "@/types/question-types";

export type GetTrueFalseQuestionsParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
  visibility?: string;
  userId?: string;
};

export const getTrueFalseQuestions = async (
  params: GetTrueFalseQuestionsParams
): Promise<PaginatedTrueFalseQuestionResponse> => {
  const cleanParams = cleanQueryParams(params);
  const queryString = new URLSearchParams(cleanParams).toString();
  const result: AxiosResponse = await api.get(
    `/questions/truefalse?${queryString}`
  );
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  };
};

export const getTrueFalseQuestionsQueryOptions = (
  params: GetTrueFalseQuestionsParams = {}
) => {
  return queryOptions({
    queryKey: ["trueFalseQuestions", params],
    queryFn: () => getTrueFalseQuestions(params),
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
