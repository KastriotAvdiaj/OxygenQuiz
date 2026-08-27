import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { LOOKUP_STALE_TIME, QueryConfig } from "@/lib/React-query";
import { QuestionLanguage } from "@/types/question-types";

export const getQuestionLanguages = (): Promise<QuestionLanguage[]> => {
  return apiService.get(`/questionLanguages`);
};

export const getQuestionLanguageQueryOptions = () => {
  return queryOptions({
    queryKey: ["getQuestionLanguages"],
    queryFn: () => getQuestionLanguages(),
    // A lookup table, not live data — see LOOKUP_STALE_TIME.
    staleTime: LOOKUP_STALE_TIME,
  });
};

type UseQuestionLanguageOptions = {
  queryConfig?: QueryConfig<typeof getQuestionLanguageQueryOptions>;
};

export const useQuestionLanguageData = ({ queryConfig }: UseQuestionLanguageOptions) => {
  return useQuery({
    ...getQuestionLanguageQueryOptions(),
    ...queryConfig,
  });
};