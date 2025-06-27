import { useQuery, queryOptions } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuizQuestionDTO } from "@/types/quiz-types";


export const getQuizQuestions = ({
  quizId,
}:{
  quizId: number;
} ): Promise<QuizQuestionDTO[]> => {
  return apiService.get(`/quiz/${quizId}/questions`);
};

export const getQuizQuestionsQueryOptions = (
  quizId: number
) => {
  return queryOptions({
    queryKey: ["quizQuestions", quizId],
    queryFn: () => getQuizQuestions({quizId}),
  });
};

type UseQuizQuestionsOptions = {
  queryConfig?: QueryConfig<typeof getQuizQuestionsQueryOptions>;
  quizId: number;
};

export const useQuizQuestionsData = ({
  queryConfig,
  quizId,
}: UseQuizQuestionsOptions) => {
  return useQuery({
    ...getQuizQuestionsQueryOptions(quizId),
    ...queryConfig,
  });
};