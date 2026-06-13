import { useQuery, queryOptions } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { QuizAnalytics } from "@/types/analytics-types";

export const getQuizAnalytics = ({
  quizId,
}: {
  quizId: number;
}): Promise<QuizAnalytics> => {
  return apiService.get(`/reports/quiz/${quizId}/analytics`);
};

export const getQuizAnalyticsQueryOptions = (quizId: number) => {
  return queryOptions({
    queryKey: ["quiz", quizId, "analytics"],
    queryFn: () => getQuizAnalytics({ quizId }),
  });
};

type UseQuizAnalyticsOptions = {
  queryConfig?: QueryConfig<typeof getQuizAnalyticsQueryOptions>;
  quizId: number;
};

export const useQuizAnalytics = ({
  queryConfig,
  quizId,
}: UseQuizAnalyticsOptions) => {
  return useQuery({
    ...getQuizAnalyticsQueryOptions(quizId),
    ...queryConfig,
  });
};
