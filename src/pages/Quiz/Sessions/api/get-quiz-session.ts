import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/Api-client';
import { QueryConfig } from '@/lib/React-query';
import type { QuizSession } from '../quiz-session-types';

export const getQuizSession = ({ sessionId }: { sessionId: string }): Promise<QuizSession> => {
  return apiService.get(`/QuizSessions/${sessionId}`);
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