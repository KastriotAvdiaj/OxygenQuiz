import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuizSummaryDTO } from "@/types/quiz-types";


export const getQuiz = ({
  quizId,
}:{
  quizId: number;
} ): Promise<QuizSummaryDTO> => {
  return api.get(`/quiz/${quizId}`);
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
  quizId: number;
};

export const useQuizData = ({
  queryConfig,
  quizId,
}: UseQuizOptions) => {
  return useQuery({
    ...getQuizQueryOptions(quizId),
    ...queryConfig,
  });
};