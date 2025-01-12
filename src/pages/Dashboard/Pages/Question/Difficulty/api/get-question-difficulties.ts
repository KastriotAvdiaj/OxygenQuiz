import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuestionDifficulty } from "@/types/ApiTypes";

export const getQuestionDifficulties = (): Promise<QuestionDifficulty[]> => {
  console.log("getQuestionCategories");
  return api.get(`/questionDifficulties`);
};

export const getQuestionDifficultyQueryOptions = () => {
  return queryOptions({
    queryKey: ["getQuestionDifficulties"],
    queryFn: () => getQuestionDifficulties(),
  });
};

type UseQuestionDifficultyOptions = {
  queryConfig?: QueryConfig<typeof getQuestionDifficultyQueryOptions>;
};

export const useQuestionDifficultyData = ({ queryConfig }: UseQuestionDifficultyOptions) => {
  return useQuery({
    ...getQuestionDifficultyQueryOptions(),
    ...queryConfig,
  });
};