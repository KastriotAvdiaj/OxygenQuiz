import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuestionLanguage } from "@/types/ApiTypes";

export const getQuestionLanguages = (): Promise<QuestionLanguage[]> => {
  return api.get(`/questionLanguages`);
};

export const getQuestionLanguageQueryOptions = () => {
  return queryOptions({
    queryKey: ["getQuestionLanguages"],
    queryFn: () => getQuestionLanguages(),
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