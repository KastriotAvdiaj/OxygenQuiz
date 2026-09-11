import { useQuery, queryOptions } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { Quiz, QuizSummaryDTO } from "@/types/quiz-types";

/**
 * Resolves the quiz behind a share-link token.
 *
 * Login is required, deliberately — the token grants *access*, the account ties the play to a
 * user (see the endpoint's own comment and docs/quiz/quiz-visibility.md). So the route that uses
 * this sends signed-out visitors to log in first rather than falling back to guest play, which
 * exists only for Public quizzes.
 *
 * 404 covers every "no" the backend gives — unknown token, and a token whose quiz has since gone
 * back to Draft. The caller shows one message for both: an expired-or-wrong link. Distinguishing
 * them would leak whether a given token had ever existed.
 */
export const getSharedQuiz = (token: string): Promise<Quiz> =>
  apiService.get(`/quiz/shared/${token}`);

export const getSharedQuizQueryOptions = (token: string) =>
  queryOptions({
    queryKey: ["quiz", "shared", token],
    queryFn: () => getSharedQuiz(token),
    // A share token resolves to the same quiz every time; don't re-ask on every focus.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

type UseSharedQuizOptions = {
  token: string;
  queryConfig?: QueryConfig<typeof getSharedQuizQueryOptions>;
};

export const useSharedQuiz = ({ token, queryConfig }: UseSharedQuizOptions) =>
  useQuery({
    ...getSharedQuizQueryOptions(token),
    ...queryConfig,
  });

/**
 * A resolved shared quiz, in the shape the catalogue's start dialog expects.
 *
 * `QuizStartModal` takes a `QuizSummaryDTO` because it was built for the catalogue grid, where
 * every card is already a summary. A share link resolves to the *full* `Quiz` instead, so the
 * two have to be reconciled somewhere — here, once, rather than by loosening the dialog's prop
 * type and letting every field become optional for every caller.
 *
 * The summary flattens what the full quiz nests: `category` is a name rather than a DTO, `user`
 * a username rather than a person. Two fields have no source at all — `colorPaletteJson` and
 * `gradient` are catalogue presentation, computed for the grid and absent from the quiz itself
 * — so the dialog falls back to its default palette for a shared quiz. That is a visual
 * difference from arriving at the same quiz through the grid, and it is the honest one: we
 * genuinely do not have that data here.
 */
export const sharedQuizToSummary = (quiz: Quiz): QuizSummaryDTO => ({
  id: quiz.id,
  title: quiz.title,
  description: quiz.description,
  category: quiz.category?.name ?? "",
  difficulty: quiz.difficulty?.level ?? "",
  language: quiz.language?.language ?? "",
  imageUrl: quiz.imageUrl,
  gradient: false,
  timeLimitInSeconds: quiz.timeLimitInSeconds,
  status: quiz.status,
  createdAt: quiz.createdAt,
  questionCount: quiz.questionCount,
  user: quiz.user?.username ?? "",
  userProfileImageUrl: quiz.user?.profileImageUrl,
});
