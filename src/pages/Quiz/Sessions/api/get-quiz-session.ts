import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/Api-client';
import { QueryConfig } from '@/lib/React-query';
import type { QuizSession, SessionGradingStatus } from '../quiz-session-types';

export const getQuizSession = ({ sessionId }: { sessionId: string }): Promise<QuizSession> => {
  return apiService.get(`/QuizSessions/${sessionId}`);
};

export const getGradingStatus = ({ sessionId }: { sessionId:string }): Promise<SessionGradingStatus> => {
  return apiService.get(`/QuizSessions/${sessionId}/grading-status`);
}

export const getSessionResults = ({ sessionId }: { sessionId: string }): Promise<QuizSession> => {
  return apiService.get(`/QuizSessions/${sessionId}/results`);
};

type UseGetQuizSessionOptions = {
  sessionId: string;
  queryConfig?: QueryConfig<typeof getQuizSession>;
};

export const useGetQuizSession = ({ 
  sessionId, 
  queryConfig 
}: UseGetQuizSessionOptions) => {
  return useQuery({
    queryKey: ['quiz-session', sessionId],
    queryFn: () => getQuizSession({ sessionId }),
    enabled: !!sessionId,
    ...queryConfig,
  });
};

type UseGetGradingStatusOptions = {
  sessionId: string;
  // Allow the component to enable/disable polling
  enabled?: boolean; 
  queryConfig?: QueryConfig<typeof getGradingStatus>;
};

export const useGetGradingStatus = ({
  sessionId,
  enabled = true,
  queryConfig,
}: UseGetGradingStatusOptions) => {
  return useQuery({
    queryKey: ['grading-status', sessionId],
    queryFn: () => getGradingStatus({ sessionId }),
    enabled: !!sessionId && enabled,
    // This is the polling magic. It refetches every 2 seconds.
    // It cleverly stops polling once the data indicates grading is complete.
    refetchInterval: (query) => 
      query.state.data?.isGradingComplete ? false : 2000,
    ...queryConfig,
  });
};


type UseGetSessionResultsOptions = {
  sessionId: string;
  queryConfig?: QueryConfig<typeof getSessionResults>;
};

export const useGetSessionResults = ({
  sessionId,
  queryConfig,
}: UseGetSessionResultsOptions) => {
  return useQuery({
    // Use a distinct queryKey to avoid cache conflicts with the original getQuizSession
    queryKey: ['quiz-session-results', sessionId],
    queryFn: () => getSessionResults({ sessionId }),
    enabled: !!sessionId,
    ...queryConfig,
  });
};