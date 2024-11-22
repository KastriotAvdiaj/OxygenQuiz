import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { Question } from "@/types/ApiTypes";

export const getQuestions = (): Promise<Question[]> => {
  return api.get(`/questions`);
};

export const getQuestionsQueryOptions = () => {
  return queryOptions({
    queryKey: ["questions"],
    queryFn: () => getQuestions(),
  });
};

type UseQuestionOptions = {
  queryConfig?: QueryConfig<typeof getQuestionsQueryOptions>;
};

export const useQuestionData = ({ queryConfig }: UseQuestionOptions) => {
  return useQuery({
    ...getQuestionsQueryOptions(),
    ...queryConfig,
  });
};
