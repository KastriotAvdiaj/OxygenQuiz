import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs, useParams } from "react-router";
import { getQuizQueryOptions, useQuizData } from "./api/get-quiz";
import { Card, CardHeader, Spinner } from "@/components/ui";
import { ContentLayout } from "@/layouts/individual-content-layout";

export const quizLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const quizId = Number(params.quizId as string);

    const quizQuery = getQuizQueryOptions(quizId);

    const promise =
      queryClient.getQueryData(quizQuery.queryKey) ??
      (await queryClient.fetchQuery(quizQuery));

    const quiz = await Promise.resolve(promise);

    return { quiz };
  };
export const QuizRoute = () => {
  const params = useParams();
  const quizId = Number(params.quizId as string);

  const quizQuery = useQuizData({ quizId });

  if (quizQuery.isLoading)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );

  if (quizQuery.isError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Failed to load quiz. Try again later.
      </div>
    );
  }

  const quiz = quizQuery.data;
  if (!quiz) return null;

  return (
    <ContentLayout title={`Quiz #${quiz.id}`}>
      <Card>
        <CardHeader>
          Quiz Details
        </CardHeader>
      </Card>
    </ContentLayout>
  );
};
