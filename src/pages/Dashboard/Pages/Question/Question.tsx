import {
  getIndividualQuestionQueryOptions,
  useIndividualQuestionData,
} from "./api/get-individual-question";
import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs, useParams } from "react-router";

export const questionLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const questionId = Number(params.questionId as string);

    const questionQuery = getIndividualQuestionQueryOptions(questionId);

    const promise =
      queryClient.getQueryData(questionQuery.queryKey) ??
      (await queryClient.fetchQuery(questionQuery));

    const question = await Promise.resolve(promise);

    return { question };
  };
export const QuestionRoute = () => {
  const params = useParams();
  const questionId = Number(params.questionId as string);
  const individualQuestionQuery = useIndividualQuestionData({
    questionId,
  });


  if (individualQuestionQuery.isLoading) {
    return <div>Loading...</div>;
  }


  if (individualQuestionQuery.isError) {
    return <div>Failed to load question. Try again later.</div>;
  }

  const question = individualQuestionQuery.data;
  if (!question) return null;

  return (
    <div className="ml-2">
      <h1>{question.text}</h1>
      <p>{question.difficulty}</p>
    </div>
  );
};
