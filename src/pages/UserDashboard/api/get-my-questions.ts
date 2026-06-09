import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { AxiosResponse } from "axios";
import {
  cleanQueryParams,
  extractPaginationFromHeaders,
} from "@/lib/pagination-query";
import { QuestionType } from "@/types/question-types";
import type {
  PaginatedMultipleChoiceQuestionResponse,
  PaginatedTrueFalseQuestionResponse,
  PaginatedTypeTheAnswerQuestionResponse,
} from "@/types/question-types";

// User-scoped question fetching. Hits /questions/myQuestions, which derives the
// owner from the auth token on the server — the client never sends a userId, so a
// user can only ever read their own questions. The `type` discriminator selects
// the typed branch added in the controller (full DTOs, with answer options, etc.).

export type GetMyQuestionsParams = {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
};

const fetchMyQuestions = async <T>(
  params: GetMyQuestionsParams,
  type: QuestionType
): Promise<T> => {
  const queryString = new URLSearchParams(
    cleanQueryParams({ ...params, type })
  ).toString();

  const result: AxiosResponse = await api.get(
    `/questions/myQuestions?${queryString}`
  );
  const pagination = extractPaginationFromHeaders(result);

  return {
    data: result.data,
    pagination: pagination || undefined,
  } as T;
};

// ── Total count (all types) ────────────────────────────────
// Calls the endpoint with no `type`, so the server returns every question the
// user owns; we only read the pagination total. Used for profile stats.
export const getMyQuestionsTotal = async (): Promise<number> => {
  const result: AxiosResponse = await api.get(
    `/questions/myQuestions?pageSize=1`
  );
  const pagination = extractPaginationFromHeaders(result);
  return pagination?.totalItems ?? (result.data?.length ?? 0);
};

export const getMyQuestionsTotalQueryOptions = () =>
  queryOptions({
    queryKey: ["myQuestions", "total"],
    queryFn: getMyQuestionsTotal,
  });

// ── Multiple choice ────────────────────────────────────────
export const getMyMultipleChoiceQuestions = (params: GetMyQuestionsParams) =>
  fetchMyQuestions<PaginatedMultipleChoiceQuestionResponse>(
    params,
    QuestionType.MultipleChoice
  );

export const getMyMultipleChoiceQuestionsQueryOptions = (
  params: GetMyQuestionsParams = {}
) =>
  queryOptions({
    queryKey: ["myQuestions", "multipleChoice", params],
    queryFn: () => getMyMultipleChoiceQuestions(params),
  });

export const useMyMultipleChoiceQuestionData = ({
  queryConfig,
  params,
}: {
  queryConfig?: QueryConfig<typeof getMyMultipleChoiceQuestionsQueryOptions>;
  params?: GetMyQuestionsParams;
}) =>
  useQuery({
    ...getMyMultipleChoiceQuestionsQueryOptions(params),
    ...queryConfig,
  });

// ── True / False ───────────────────────────────────────────
export const getMyTrueFalseQuestions = (params: GetMyQuestionsParams) =>
  fetchMyQuestions<PaginatedTrueFalseQuestionResponse>(
    params,
    QuestionType.TrueFalse
  );

export const getMyTrueFalseQuestionsQueryOptions = (
  params: GetMyQuestionsParams = {}
) =>
  queryOptions({
    queryKey: ["myQuestions", "trueFalse", params],
    queryFn: () => getMyTrueFalseQuestions(params),
  });

export const useMyTrueFalseQuestionData = ({
  queryConfig,
  params,
}: {
  queryConfig?: QueryConfig<typeof getMyTrueFalseQuestionsQueryOptions>;
  params?: GetMyQuestionsParams;
}) =>
  useQuery({
    ...getMyTrueFalseQuestionsQueryOptions(params),
    ...queryConfig,
  });

// ── Type the answer ────────────────────────────────────────
export const getMyTypeTheAnswerQuestions = (params: GetMyQuestionsParams) =>
  fetchMyQuestions<PaginatedTypeTheAnswerQuestionResponse>(
    params,
    QuestionType.TypeTheAnswer
  );

export const getMyTypeTheAnswerQuestionsQueryOptions = (
  params: GetMyQuestionsParams = {}
) =>
  queryOptions({
    queryKey: ["myQuestions", "typeTheAnswer", params],
    queryFn: () => getMyTypeTheAnswerQuestions(params),
  });

export const useMyTypeTheAnswerQuestionData = ({
  queryConfig,
  params,
}: {
  queryConfig?: QueryConfig<typeof getMyTypeTheAnswerQuestionsQueryOptions>;
  params?: GetMyQuestionsParams;
}) =>
  useQuery({
    ...getMyTypeTheAnswerQuestionsQueryOptions(params),
    ...queryConfig,
  });
