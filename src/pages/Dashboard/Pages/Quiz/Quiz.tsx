import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs, useParams } from "react-router";
import { getQuizQueryOptions } from "./api/get-quiz";
import { useQuizData } from "./api/get-quizzes";

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

  const params = useParams();
  const quizId = Number(params.id as string);

  const quizQuery = useQuizData({quizId});

  return <div>Route</div>;
};
