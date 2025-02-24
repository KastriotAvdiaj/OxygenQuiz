import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { Quiz } from "@/types/ApiTypes";


export const getQuizzes = (): Promise<Quiz[]> => {
  return api.get(`/quizzes`);
};

export const getQuizzesQueryOptions = () => {
  return queryOptions({
    queryKey:  ["quizzes"],
    queryFn: () => getQuizzes(),
  });
};

type UseQuizOptions = {
  queryConfig?: QueryConfig<typeof getQuizzesQueryOptions>;
};

export const useQuizData = ({ queryConfig}: UseQuizOptions) => {
  return useQuery({
    ...getQuizzesQueryOptions(),
    ...queryConfig,
  });
};

