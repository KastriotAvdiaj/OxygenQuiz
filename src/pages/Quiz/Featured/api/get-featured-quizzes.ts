import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { featuredQuizKeys } from "@/lib/query-keys";
import type { QuizSummaryDTO } from "@/types/quiz-types";

/**
 * The featured quizzes behind the quiz home page (`GET /quiz/featured`, anonymous). Only live,
 * published ones come back; a missing slot is simply absent. See docs/quiz/featured-quizzes.md.
 */
export const getFeaturedQuizzes = async (): Promise<QuizSummaryDTO[]> =>
  (await api.get<QuizSummaryDTO[]>("/quiz/featured")).data;

export const getFeaturedQuizzesQueryOptions = () =>
  queryOptions({
    queryKey: featuredQuizKeys.all,
    queryFn: getFeaturedQuizzes,
    // Changes only when a SuperAdmin or the seeder touches a featured quiz.
    staleTime: 5 * 60 * 1000,
  });

export const useFeaturedQuizzes = () => useQuery(getFeaturedQuizzesQueryOptions());
