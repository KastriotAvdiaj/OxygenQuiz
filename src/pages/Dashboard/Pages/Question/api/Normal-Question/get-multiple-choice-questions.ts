import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { PaginatedMultipleChoiceQuestionResponse, Pagination } from "@/types/ApiTypes";
import { AxiosResponse } from 'axios';
type GetMultipleChoiceQuestionsParams = {
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
  const cleanParams = Object.fromEntries(
    Object.entries(params ?? {}) 
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)])
  ) as Record<string, string>;
  
  const queryString = new URLSearchParams(cleanParams).toString();
  const result: AxiosResponse = await api.get(`/questions/multiplechoice?${queryString}`);
  const pagination = extractPaginationFromHeaders(result);
  return {
    data: result.data,
    pagination: pagination || undefined
  };
};

function extractPaginationFromHeaders(response: AxiosResponse): Pagination | null {
  const paginationHeader = response.headers['pagination']; 
  if (paginationHeader && typeof paginationHeader === 'string') {
    try {
      const parsedData = JSON.parse(paginationHeader);
      // Basic validation (optional but good)
      if (
        typeof parsedData.currentPage === 'number' &&
        typeof parsedData.itemsPerPage === 'number' &&
        typeof parsedData.totalItems === 'number' &&
        typeof parsedData.totalPages === 'number' &&
        typeof parsedData.hasNextPage === 'boolean' &&
        typeof parsedData.hasPreviousPage === 'boolean'
      ) {
        return parsedData as Pagination;
      } else {
        console.error('Parsed pagination header has unexpected structure', parsedData);
      }
    } catch (e) {
      console.error('Failed to parse pagination header', e, paginationHeader);
    }
  }
  return null;
}

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

