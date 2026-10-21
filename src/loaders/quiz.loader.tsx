import { handleLoaderError } from "@/lib/loaderError";
import { getQuizQueryOptions } from "@/pages/Dashboard/Pages/Quiz/api/get-quiz";
import { getQuizQuestionsQueryOptions } from "@/pages/Dashboard/Pages/Quiz/api/get-quiz-questions";
import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs } from "react-router-dom";

export const quizLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const quizId = Number(params.quizId as string);

    if (isNaN(quizId) || quizId <= 0) {
      throw new Error("Invalid quiz ID");
    }

    const quizQuery = getQuizQueryOptions(quizId);

    const quiz = await handleLoaderError(async () => {
      const cachedData = queryClient.getQueryData(quizQuery.queryKey);
      return cachedData || queryClient.fetchQuery(quizQuery);
    });

    // Warm the question list too, so the page arrives with its right-hand column filled instead
    // of mounting and then showing a loader for it (docs/development/loading-states.md §6). Not
    // for a board — it has no questions, and the page doesn't ask for them. `prefetchQuery`
    // never throws: a refused fetch (someone else's quiz on /my-dashboard) stays the page's to
    // render.
    if (quiz?.format !== "Associations") {
      await queryClient.prefetchQuery(getQuizQuestionsQueryOptions(quizId));
    }

    return { quiz };
  };
