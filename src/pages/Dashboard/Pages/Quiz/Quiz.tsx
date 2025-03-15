import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs } from "react-router";
import { getQuizQueryOptions } from "./api/get-quiz";

export const quizLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const quizId = Number(params.id as string);

    const quizQuery = getQuizQueryOptions(quizId);

    const promise =
      queryClient.getQueryData(quizQuery.queryKey) ??
      (await queryClient.fetchQuery(quizQuery));

    const quiz = await Promise.resolve(promise);

    return { quiz };
  };
export const QuizRoute = () => {
  return <div>Route</div>;
};
