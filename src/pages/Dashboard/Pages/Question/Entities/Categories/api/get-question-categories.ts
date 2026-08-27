import { queryOptions, useQuery } from "@tanstack/react-query";

import {  apiService } from "@/lib/Api-client";
import { LOOKUP_STALE_TIME, QueryConfig } from "@/lib/React-query";
import { QuestionCategory } from "@/types/question-types";

export const getQuestionCategories = (): Promise<QuestionCategory[]> => {
  return apiService.get(`/questionCategories`);
};

export const getQuestionCategoriesQueryOptions = () => {
  return queryOptions({
    queryKey: ["questionCategories"],
    queryFn: () => getQuestionCategories(),
    // A lookup table, not live data — see LOOKUP_STALE_TIME. The mutations below invalidate
    // this key, so an edit still shows up at once.
    staleTime: LOOKUP_STALE_TIME,
  });
};

type UseQuestionCategoriesOptions = {
  queryConfig?: QueryConfig<typeof getQuestionCategoriesQueryOptions>;
};

export const useQuestionCategoryData = ({ queryConfig }: UseQuestionCategoriesOptions) => {
  return useQuery({
    ...getQuestionCategoriesQueryOptions(),
    ...queryConfig,
  });
};
