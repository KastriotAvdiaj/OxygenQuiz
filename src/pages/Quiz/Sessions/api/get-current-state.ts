import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/Api-client';
import { QueryConfig } from '@/lib/React-query';
import { QuizState } from '../quiz-session-types';

export const getCurrentState = ({ sessionId }: { sessionId: string }): Promise<QuizState> => {
  return apiService.get(`/QuizSessions/${sessionId}/current-state`);
};

export const getCurrentStateQueryOptions = ({ sessionId }: { sessionId: string }) => {
  return queryOptions({
    queryKey: ['quizState', sessionId],
    queryFn: () => getCurrentState({ sessionId }),
  });
};

type UseCurrentStateOptions = {
  sessionId: string | null; // Pass null or undefined to disable the query
  queryConfig?: QueryConfig<typeof getCurrentStateQueryOptions>;
};

export const useCurrentStateData = ({ sessionId, queryConfig }: UseCurrentStateOptions) => {
  return useQuery({
    ...getCurrentStateQueryOptions({ sessionId: sessionId! }), // The ! is safe because of the 'enabled' flag
    // This query should only run if a sessionId is actually provided.
    enabled: !!sessionId, 
    ...queryConfig,
  });
};