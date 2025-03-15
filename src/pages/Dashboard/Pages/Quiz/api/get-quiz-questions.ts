import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import {  Question} from "@/types/ApiTypes";

export type QuizQuestion = {
    quizId: number; //these are being sent from the back so maybe we need to change it since we're not using them in the front
    questionId: number; // this too
    score: number;
    question: Question;
}

export const getQuizQuestions = ({
  quizId,
}:{
  quizId: number;
} ): Promise<QuizQuestion[]> => {
  return api.get(`/quizzes/${quizId}/questions`);
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