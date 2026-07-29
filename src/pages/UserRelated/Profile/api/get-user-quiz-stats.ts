import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { UserQuizStats } from "@/types/quiz-session-types";

/**
 * GET /api/users/{id}/quiz-stats — aggregate play statistics for the profile stat cards.
 * Own stats only (admins may view anyone's), so this is never called for a public profile.
 * See docs/quiz/user-stats-history.md.
 */
export const getUserQuizStats = (userId: string): Promise<UserQuizStats> =>
  apiService.get(`/users/${userId}/quiz-stats`);

export const getUserQuizStatsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user-quiz-stats", userId],
    queryFn: () => getUserQuizStats(userId),
    enabled: !!userId,
    // Overrides the app-wide `throwOnError: true`. Stats are supplementary: if this
    // endpoint is missing (frontend deployed ahead of the API) or briefly failing, the
    // panel should show "—", not throw and take the whole page down with it. Callers
    // read `data` as possibly-undefined and already render placeholders.
    throwOnError: false,
  });

export const useUserQuizStats = (userId: string) =>
  useQuery(getUserQuizStatsQueryOptions(userId));
