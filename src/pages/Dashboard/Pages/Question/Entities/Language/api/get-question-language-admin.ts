import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuestionLanguage } from "@/types/question-types";

/**
 * The admin list — the same rows as `getQuestionLanguages`, plus who created each one.
 *
 * A second endpoint rather than a field on the public list: the creator's username is admin
 * metadata, and the public list is served anonymously and embedded in question and quiz
 * payloads. See `QuestionCategoryDTO` on the backend, and the `username` note on
 * `QuestionCategory` in `@/types/question-types`.
 *
 * Only the dashboard's languages table should use this. Everything else — selects, filters,
 * the AI generator's vocabulary — wants the public list.
 */
export const getQuestionLanguagesForAdmin = (): Promise<QuestionLanguage[]> => {
  return apiService.get(`/questionLanguages/admin`);
};

export const getQuestionLanguageAdminQueryOptions = () => {
  return queryOptions({
    queryKey: ["getQuestionLanguages", "admin"],
    queryFn: () => getQuestionLanguagesForAdmin(),
  });
};

type UseQuestionLanguageAdminOptions = {
  queryConfig?: QueryConfig<typeof getQuestionLanguageAdminQueryOptions>;
};

export const useQuestionLanguageAdminData = ({
  queryConfig,
}: UseQuestionLanguageAdminOptions) => {
  return useQuery({
    ...getQuestionLanguageAdminQueryOptions(),
    ...queryConfig,
  });
};
