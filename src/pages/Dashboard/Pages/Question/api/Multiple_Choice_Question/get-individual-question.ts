import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { IndividualQuestion } from "@/types/question-types";
import { questionKeys } from "@/lib/query-keys";


// The client's interceptor hands back the whole axios response, so the body is `.data` — this
// returned the response itself until 2026-11-11, which nothing noticed until the screenshot
// import's duplicate preview became its first reader.
export const getIndividualQuestion = async ({
  questionId,
}: {
  questionId: number;
}): Promise<IndividualQuestion> => {
  const response = await api.get(`/questions/${questionId}`);
  return response.data;
};

export const getIndividualQuestionQueryOptions = (
  questionId: number
) => {
  return queryOptions({
    queryKey: questionKeys.detail(questionId),
    queryFn: () => getIndividualQuestion({questionId}),
  });
};

type UseIndividualQuestionOptions = {
  queryConfig?: QueryConfig<typeof getIndividualQuestionQueryOptions>;
  questionId: number;
};

export const useIndividualQuestionData = ({
  queryConfig,
  questionId,
}: UseIndividualQuestionOptions) => {
  return useQuery({
    ...getIndividualQuestionQueryOptions(questionId),
    ...queryConfig,
  });
};