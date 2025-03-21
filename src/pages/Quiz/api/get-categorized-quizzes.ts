import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {  Quiz } from "@/types/ApiTypes";

export const getCategoriedQuizzes = (): Promise<Quiz[]> => {
  return api.get(`/quizzes/by-category`);
};

export const getCategorizedQuizzesQueryOptions = (
) => {
  return queryOptions({
    queryKey: ["categorizedQuizzes"],
    queryFn: () => getCategoriedQuizzes(),
  });
};

type UseQuizOptions = {
  queryConfig?: QueryConfig<typeof getCategorizedQuizzesQueryOptions>;
};

export const useCategoriedQuizzesData = ({
  queryConfig,
}: UseQuizOptions) => {
  return useQuery({
    ...getCategorizedQuizzesQueryOptions(),
    ...queryConfig,
  });
};