import {
  getIndividualQuestionQueryOptions,
  useIndividualQuestionData,
} from "./api/get-individual-question";
import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs, useParams } from "react-router";
import { ContentLayout } from "@/layouts/individual-content-layout";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AnswerOptionViewList } from "./Components/answer-option-view-list";

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
    <ContentLayout title={`Question #${question.id}`}>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">{question.text}</h2>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="flex items-center">
            <span className="mr-2 text-sm font-medium">Difficulty:</span>
            <Badge variant="secondary">{question.difficulty}</Badge>
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-sm font-medium">Category:</span>
            <Badge variant="primary">{question.category}</Badge>
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-sm font-medium">Language:</span>
            <Badge variant="primary">{question.language}</Badge>
          </div>
        </div>

        <div>
          <AnswerOptionViewList answerOptions={question.answerOptions} />
        </div>

        <div className="text-sm text-gray-500">
          <p>Created by: {question.user.username}</p>
          <p>Created at: {format(new Date(question.createdAt), "PPpp")}</p>
        </div>
      </div>
    </ContentLayout>
  );
};
