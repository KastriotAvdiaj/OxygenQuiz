import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuestionLanguage } from "@/types/ApiTypes";

export const getQuestionLanguages = (): Promise<QuestionLanguage[]> => {
  return api.get(`/questionLanguages`);
};

export const getQuestionLanguageQueryOptions = () => {
  return queryOptions({
    queryKey: ["getQuestionLangauges"],
    queryFn: () => getQuestionLanguages(),
  });
};

type UseQuestionLangaugeOptions = {
  queryConfig?: QueryConfig<typeof getQuestionLanguageQueryOptions>;
};

export const useQuestionLangaugeData = ({ queryConfig }: UseQuestionLangaugeOptions) => {
  return useQuery({
    ...getQuestionLanguageQueryOptions(),
    ...queryConfig,
  });
};