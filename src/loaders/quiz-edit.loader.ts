import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs } from "react-router-dom";
import { getQuizQueryOptions } from "@/pages/Dashboard/Pages/Quiz/api/get-quiz";
import { getQuizQuestionsQueryOptions } from "@/pages/Dashboard/Pages/Quiz/api/get-quiz-questions";

/**
 * Warms the Classic quiz editor's two queries while its chunk downloads, so `EditQuizRoute`
 * mounts with both already cached and never shows its own loader after the route arrives
 * (docs/development/loading-states.md §6). Without it, a click on Edit froze the list for the
 * chunk, then swapped to a loader for the quiz, then the questions — and nothing on screen said
 * the click had landed. The dashboard's `RouteProgressBar` covers the frozen part.
 *
 * In parallel, not quiz-then-questions: this route is only reached for Classic quizzes
 * (`quizEditPath` sends boards to `/board`), so the questions are always wanted.
 *
 * `prefetchQuery`, never `ensureQueryData`: a failed fetch stays the component's to render
 * ("Oops! Brain freeze!"), not the route's `errorElement`.
 */
export const quizEditLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const quizId = Number(params.quizId as string);
    if (!Number.isFinite(quizId) || quizId <= 0) return null;

    await Promise.all([
      queryClient.prefetchQuery(getQuizQueryOptions(quizId)),
      queryClient.prefetchQuery(getQuizQuestionsQueryOptions(quizId)),
    ]);
    return null;
  };
