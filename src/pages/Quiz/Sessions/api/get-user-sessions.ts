import { queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import type { PagedResponse } from "@/lib/filtering/types";
import type { QuizSessionSummary } from "@/types/quiz-session-types";

/**
 * GET /api/quizsessions/user/{userId} — a user's play history, newest first, paginated.
 * Own history only (admins may view anyone's). Guest sessions are excluded server-side.
 * Canonical home for this call: both the profile history list and the resume flow use it.
 * See docs/quiz/user-stats-history.md.
 */
export const getUserSessions = ({
  userId,
  page = 1,
  pageSize = 20,
}: {
  userId: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<QuizSessionSummary>> =>
  apiService.get(`/quizsessions/user/${userId}?page=${page}&pageSize=${pageSize}`);

export const getUserSessionsQueryOptions = ({
  userId,
  page = 1,
  pageSize = 20,
}: {
  userId: string;
  page?: number;
  pageSize?: number;
}) =>
  queryOptions({
    queryKey: ["user-sessions", userId, page, pageSize],
    queryFn: () => getUserSessions({ userId, page, pageSize }),
    enabled: !!userId,
    // Keep the previous page visible while the next one loads — avoids the list
    // collapsing to a spinner on every page change.
    placeholderData: keepPreviousData,
    // Overrides the app-wide `throwOnError: true` so a failed history fetch degrades to
    // QuizHistoryList's inline error state instead of unmounting the page. Without this
    // that component's `isError` branch is unreachable — the query throws first.
    throwOnError: false,
  });

export const useUserSessions = (params: {
  userId: string;
  page?: number;
  pageSize?: number;
}) => useQuery(getUserSessionsQueryOptions(params));
