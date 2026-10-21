import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import type { QuizFormat } from "@/types/quiz-types";

/**
 * GET /api/quiz/{id}/listing — the public page's content (`QuizListingDTO`). Anonymous, and the
 * same for every caller; 404 unless the quiz is Public in a released format.
 * docs/quiz/quiz-listing.md, "The API".
 */
export type QuizListing = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  colorPaletteJson?: string | null;
  gradient: boolean;
  difficulty: string;
  language: string;
  questionCount: number;
  timeLimitInSeconds: number;
  author: string;
  imageUrl?: string | null;
  format: QuizFormat;
  createdAt: string;
  updatedAt: string;
};

export const getQuizListing = (quizId: number): Promise<QuizListing> =>
  apiService.get(`/quiz/${quizId}/listing`);

export const quizListingQueryOptions = (quizId: number) =>
  queryOptions({
    queryKey: ["quizListing", quizId],
    queryFn: () => getQuizListing(quizId),
    // A 404 is the answer, not a hiccup: the quiz isn't public.
    retry: false,
  });

export const useQuizListing = (quizId: number, enabled = true) =>
  useQuery({ ...quizListingQueryOptions(quizId), enabled });
