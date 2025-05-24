import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {  QuizSummaryDTO } from "@/types/ApiTypes";

type GetAllQuizzesParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
  visibility?: string;
}

export const getAllQuizzes = (): Promise<QuizSummaryDTO[]> => {
  return api.get(`/quiz`);
};

export const getAllQuizzesQueryOptions = () => {
  return queryOptions({
    queryKey:  ["quiz"],
    queryFn: () => getAllQuizzes(),
  });
};

type UseAllQuizOptions = {
  queryConfig?: QueryConfig<typeof getAllQuizzesQueryOptions>;
};

export const useAllQuizzesData = ({ queryConfig}: UseAllQuizOptions) => {
  return useQuery({
    ...getAllQuizzesQueryOptions(),
    ...queryConfig,
  });
};

