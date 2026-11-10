import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchPaged, type FilterQuery, type PagedResponse } from "@/lib/filtering";
import { QuestionType } from "@/types/question-types";
import { questionKeys } from "@/lib/query-keys";

// Typed question search over the shared filtering framework (see docs/quiz/filtering.md).
// One hook for all three question types and every scope; the type/scope only pick the URL.

/**
 * - `all` — every question to an admin (the Questions page); to anyone else the server narrows
 *   it to their own plus Public ones.
 * - `mine` — the caller's own.
 * - `public` — Public questions only, for everyone (the quiz builder's "Public questions").
 * The narrowing is the server's (docs/quiz/question-bank.md, "Picking"); the URL only asks.
 */
export type QuestionSearchScope = "all" | "mine" | "public";

const URL_SEGMENT: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: "multiplechoice",
  [QuestionType.TrueFalse]: "truefalse",
  [QuestionType.TypeTheAnswer]: "typetheanswer",
};

const buildUrl = (type: QuestionType, scope: QuestionSearchScope) =>
  scope === "all"
    ? `/questions/${URL_SEGMENT[type]}/search`
    : `/questions/${scope}/${URL_SEGMENT[type]}/search`;

const searchTypedQuestions = <T>(
  type: QuestionType,
  scope: QuestionSearchScope,
  query: FilterQuery
): Promise<PagedResponse<T>> => fetchPaged<T>(buildUrl(type, scope), query);

/** Shared by the hook and the Questions route's prefetch, so both use one cache key. */
export const typedQuestionSearchQueryOptions = <T>(
  type: QuestionType,
  scope: QuestionSearchScope,
  query: FilterQuery,
) =>
  queryOptions({
    queryKey: questionKeys.typedSearch(scope, type, query),
    queryFn: () => searchTypedQuestions<T>(type, scope, query),
  });

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
    ...typedQuestionSearchQueryOptions<T>(type, scope, query),
    enabled,
  });
