import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuestionDifficulty } from "@/types/question-types";

/**
 * The admin list — the same rows as `getQuestionDifficulties`, plus who created each one.
 *
 * A second endpoint rather than a field on the public list: the creator's username is admin
 * metadata, and the public list is served anonymously and embedded in question and quiz
 * payloads. See `QuestionCategoryDTO` on the backend, and the `username` note on
 * `QuestionCategory` in `@/types/question-types`.
 *
 * Only the dashboard's difficulties table should use this. Everything else — selects, filters,
 * the AI generator's vocabulary — wants the public list.
 */
export const getQuestionDifficultiesForAdmin = (): Promise<QuestionDifficulty[]> => {
  return apiService.get(`/questionDifficulties/admin`);
};

export const getQuestionDifficultyAdminQueryOptions = () => {
  return queryOptions({
    // A distinct key from the public list: same rows, different shape, different audience.
    // Sharing one key would let a public response overwrite the admin table's cache and
    // silently blank the creator column.
    queryKey: ["getQuestionDifficulties", "admin"],
    queryFn: () => getQuestionDifficultiesForAdmin(),
  });
};

type UseQuestionDifficultyAdminOptions = {
  queryConfig?: QueryConfig<typeof getQuestionDifficultyAdminQueryOptions>;
};

export const useQuestionDifficultyAdminData = ({
  queryConfig,
}: UseQuestionDifficultyAdminOptions) => {
  return useQuery({
    ...getQuestionDifficultyAdminQueryOptions(),
    ...queryConfig,
  });
};
