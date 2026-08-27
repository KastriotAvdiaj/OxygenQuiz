import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { LOOKUP_STALE_TIME, QueryConfig } from "@/lib/React-query";
import { QuestionDifficulty } from "@/types/question-types";

export const getQuestionDifficulties = (): Promise<QuestionDifficulty[]> => {
  return apiService.get(`/questionDifficulties`);
};

export const getQuestionDifficultyQueryOptions = () => {
  return queryOptions({
    queryKey: ["getQuestionDifficulties"],
    queryFn: () => getQuestionDifficulties(),
    // A lookup table, not live data — see LOOKUP_STALE_TIME.
    staleTime: LOOKUP_STALE_TIME,
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