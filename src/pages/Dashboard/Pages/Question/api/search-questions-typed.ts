import { useQuery } from "@tanstack/react-query";
import { fetchPaged, type FilterQuery, type PagedResponse } from "@/lib/filtering";
import { QuestionType } from "@/types/question-types";
import { questionKeys } from "@/lib/query-keys";

// Typed question search over the shared filtering framework (see docs/quiz/filtering.md).
// One hook for all three question types and both scopes; the type/scope only pick the URL.

export type QuestionSearchScope = "all" | "mine";

const URL_SEGMENT: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: "multiplechoice",
  [QuestionType.TrueFalse]: "truefalse",
  [QuestionType.TypeTheAnswer]: "typetheanswer",
};

const buildUrl = (type: QuestionType, scope: QuestionSearchScope) =>
  scope === "mine"
    ? `/questions/mine/${URL_SEGMENT[type]}/search`
    : `/questions/${URL_SEGMENT[type]}/search`;

const searchTypedQuestions = <T>(
  type: QuestionType,
  scope: QuestionSearchScope,
  query: FilterQuery
): Promise<PagedResponse<T>> => fetchPaged<T>(buildUrl(type, scope), query);

export const useTypedQuestionSearch = <T>({
  type,
  scope = "all",
  query = {},
  enabled = true,
}: {
  type: QuestionType;
  scope?: QuestionSearchScope;
  query?: FilterQuery;
  enabled?: boolean; // only the active tab fetches
}) =>
  useQuery({
    queryKey: questionKeys.typedSearch(scope, type, query),
    queryFn: () => searchTypedQuestions<T>(type, scope, query),
    enabled,
  });
