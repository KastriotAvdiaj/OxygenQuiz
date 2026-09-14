import { useQuery, queryOptions } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuizAnalytics } from "@/types/analytics-types";

/**
 * The viewer's clock, as the server needs it to bucket attempts by day.
 *
 * The server has no way to know whose day a play belongs to — it only has the UTC instant — so
 * until this was sent, `attemptsOverTime` was grouped by the **server's** UTC date and an attempt
 * at 01:00 in UTC+2 was charted on the previous day.
 *
 * Two values, because the IANA name needs tzdata present in the API image and that is a property
 * of the deployment rather than something the client can check. `offsetMinutes` is the backstop:
 * a fixed offset is wrong across a DST boundary, but wrong by an hour beats wrong by a day.
 *
 * Note the negation — `getTimezoneOffset()` returns **-120** for UTC+2 (it is the offset to add
 * to local time to reach UTC), and the API wants the conventional east-positive form.
 */
const viewerClock = () => {
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    // Intl is present everywhere we support, but resolvedOptions() can throw on a locked-down
    // runtime. The offset below is enough on its own.
    timeZone = undefined;
  }
  return { timeZone, offsetMinutes: -new Date().getTimezoneOffset() };
};

/**
 * Which plays the numbers are about (mirrors the API's `SessionModeFilter`).
 *
 * `SinglePlayer` is the default on both sides. A multiplayer match is played against a fixed clock
 * with other people racing, which depresses scores for reasons that have nothing to do with the
 * questions — and an author reads "average score" to judge exactly that. The other two values are a
 * deliberate choice, never a default.
 */
export type AnalyticsMode = "SinglePlayer" | "Multiplayer" | "All";

export const getQuizAnalytics = ({
  quizId,
  mode = "SinglePlayer",
}: {
  quizId: number;
  mode?: AnalyticsMode;
}): Promise<QuizAnalytics> => {
  return apiService.get(`/reports/quiz/${quizId}/analytics`, {
    params: { ...viewerClock(), mode },
  });
};

export const getQuizAnalyticsQueryOptions = (
  quizId: number,
  mode: AnalyticsMode = "SinglePlayer",
) => {
  return queryOptions({
    // The zone is NOT part of the key. It is stable for the life of a session, and a viewer who
    // crosses a boundary mid-session gets the new bucketing on the next natural refetch — not
    // worth a cache miss on every mount to pre-empt.
    //
    // The mode IS part of it: it changes the answer, the viewer flips it deliberately, and each
    // setting is worth keeping so switching back and forth is instant rather than a refetch.
    queryKey: ["quiz", quizId, "analytics", mode],
    queryFn: () => getQuizAnalytics({ quizId, mode }),
  });
};

type UseQuizAnalyticsOptions = {
  queryConfig?: QueryConfig<typeof getQuizAnalyticsQueryOptions>;
  quizId: number;
  mode?: AnalyticsMode;
};

export const useQuizAnalytics = ({
  queryConfig,
  quizId,
  mode = "SinglePlayer",
}: UseQuizAnalyticsOptions) => {
  return useQuery({
    ...getQuizAnalyticsQueryOptions(quizId, mode),
    ...queryConfig,
  });
};
