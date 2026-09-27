import { queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { buildFilterParams, type FilterQuery, type PagedResponse } from "@/lib/filtering";
import type { QuizSessionSummary } from "@/types/quiz-session-types";

/**
 * The subset of the shared FilterQuery the history endpoint understands. Fields it filters,
 * searches and sorts on are whitelisted by the backend's `QuizSessionFilterFields`:
 * `quizTitle` (searchable, sortable), `quizId`, `categoryId`, `difficultyId`, `languageId`,
 * `status` (see SESSION_HISTORY_STATUS), `totalScore` (sortable) and `startTime` (sortable,
 * the default — newest first).
 */
export type UserSessionsQuery = Pick<
  FilterQuery,
  "page" | "pageSize" | "search" | "sort" | "filters"
>;

/**
 * `status` filter values — mirrors the backend's `SessionHistoryStatus` enum. Abandoned wins
 * over completed, the same precedence as the history card's badge.
 */
export const SESSION_HISTORY_STATUS = {
  InProgress: 0,
  Completed: 1,
  Abandoned: 2,
} as const;

const DEFAULT_PAGE_SIZE = 20;

/**
 * GET /api/quizsessions/user/{userId} — a user's play history, paginated and filterable through
 * the standard FilterQuery wire format (docs/quiz/filtering.md). Own history only (admins may
 * view anyone's). Guest sessions and sessions on deleted quizzes are excluded server-side.
 * Canonical home for this call: both the history list and the resume flow use it.
 * See docs/quiz/user-stats-history.md.
 */
export const getUserSessions = ({
  userId,
  query = {},
}: {
  userId: string;
  query?: UserSessionsQuery;
}): Promise<PagedResponse<QuizSessionSummary>> => {
  const params = buildFilterParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...query });
  return apiService.get(`/quizsessions/user/${userId}?${params.toString()}`);
};

export const getUserSessionsQueryOptions = ({
  userId,
  query = {},
}: {
  userId: string;
  query?: UserSessionsQuery;
}) =>
  queryOptions({
    // The serialized params are the identity of a result set: two queries that send the same
    // wire format share a cache entry, and any filter/sort/page change is a new key.
    queryKey: [
      "user-sessions",
      userId,
      buildFilterParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...query }).toString(),
    ],
    queryFn: () => getUserSessions({ userId, query }),
    enabled: !!userId,
    // Keep the previous page visible while the next one loads — avoids the list
    // collapsing to a spinner on every page or filter change.
    placeholderData: keepPreviousData,
    // Overrides the app-wide `throwOnError: true` so a failed history fetch degrades to
    // QuizHistoryList's inline error state instead of unmounting the page. Without this
    // that component's `isError` branch is unreachable — the query throws first.
    throwOnError: false,
  });

export const useUserSessions = (params: { userId: string; query?: UserSessionsQuery }) =>
  useQuery(getUserSessionsQueryOptions(params));
