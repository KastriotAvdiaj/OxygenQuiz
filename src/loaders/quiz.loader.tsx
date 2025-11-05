import { handleLoaderError } from "@/lib/loaderError";
import { getQuizQueryOptions } from "@/pages/Dashboard/Pages/Quiz/api/get-quiz";
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

    return { quiz };
  };
