import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {  Quiz } from "@/types/ApiTypes";


export const getQuiz = ({
  quizId,
}:{
  quizId: number;
} ): Promise<Quiz> => {
  return api.get(`/quizzes/${quizId}`);
};

export const getQuizQueryOptions = (
  quizId: number
) => {
  return queryOptions({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuiz({quizId}),
  });
};

type UseQuizOptions = {
  queryConfig?: QueryConfig<typeof getQuizQueryOptions>;
  questionId: number;
};

export const useQuizData = ({
  queryConfig,
  questionId,
}: UseQuizOptions) => {
  return useQuery({
    ...getQuizQueryOptions(questionId),
    ...queryConfig,
  });
};