import { queryOptions, useQuery } from "@tanstack/react-query";

import {  apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuestionCategory } from "@/types/question-types";

export const getQuestionCategories = (): Promise<QuestionCategory[]> => {
  return apiService.get(`/questionCategories`);
};

export const getQuestionCategoriesQueryOptions = () => {
  return queryOptions({
    queryKey: ["questionCategories"],
    queryFn: () => getQuestionCategories(),
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
