import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { IndividualQuestion } from "@/types/question-types";
import { questionKeys } from "@/lib/query-keys";


export const getIndividualQuestion = ({
  questionId,
}:{
  questionId: number;
} ): Promise< IndividualQuestion> => {
  return api.get(`/questions/${questionId}`);
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