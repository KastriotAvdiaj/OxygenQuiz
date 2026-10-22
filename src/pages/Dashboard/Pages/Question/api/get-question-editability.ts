import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { questionKeys } from "@/lib/query-keys";

/** Why the builder may not edit a saved question in place — `QuestionEditLock` on the server. */
export type QuestionEditLockReason = "NotYours" | "Played" | "UsedElsewhere";

export type QuestionEditability = {
  questionId: number;
  canEditInPlace: boolean;
  reason: QuestionEditLockReason | null;
  /** Other live quizzes using it (only for your own questions). */
  otherQuizCount: number;
};

/**
 * `GET /questions/editability` — for each saved question in the builder, whether it may be edited
 * in place (`QuestionEditRule`, docs/quiz/quiz-editing.md). The API is the gate: an in-place save
 * it would refuse comes back 409; this is what lets the builder not offer one.
 *
 * The query string is built by hand: axios writes arrays as `ids[]=1`, which ASP.NET does not
 * bind to `int[] ids`.
 */
export const getQuestionEditability = (
  ids: readonly number[],
  quizId: number | null,
): Promise<QuestionEditability[]> => {
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("ids", String(id)));
  if (quizId !== null) params.append("quizId", String(quizId));
  return apiService.get(`/questions/editability?${params.toString()}`);
};

export const questionEditabilityQueryOptions = (ids: readonly number[], quizId: number | null) => {
  const sorted = [...ids].sort((a, b) => a - b);
  return queryOptions({
    queryKey: questionKeys.editability(quizId, sorted),
    queryFn: () => getQuestionEditability(sorted, quizId),
    enabled: sorted.length > 0,
  });
};

// The id list changes on every add and remove; keep the last answer meanwhile so cards don't
// flicker back to "checking". A newly added id is simply absent until the answer arrives.
export const useQuestionEditability = (ids: readonly number[], quizId: number | null) =>
  useQuery({ ...questionEditabilityQueryOptions(ids, quizId), placeholderData: keepPreviousData });
