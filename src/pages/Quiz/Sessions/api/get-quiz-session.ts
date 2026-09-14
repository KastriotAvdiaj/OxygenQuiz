import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/Api-client';
import { QueryConfig } from '@/lib/React-query';
import type { QuizSession, SessionGradingStatus } from '../../../../types/quiz-session-types';

export const getQuizSession = ({ sessionId }: { sessionId: string }): Promise<QuizSession> => {
  return apiService.get(`/QuizSessions/${sessionId}`);
};

export const getGradingStatus = ({ sessionId }: { sessionId:string }): Promise<SessionGradingStatus> => {
  return apiService.get(`/QuizSessions/${sessionId}/grading-status`);
}

export const getSessionResults = ({ sessionId }: { sessionId: string }): Promise<QuizSession> => {
  return apiService.get(`/QuizSessions/${sessionId}/results`);
};

/**
 * One player's line in a finished multiplayer match (mirrors the API's `MatchPlayerDto`).
 * `sessionId` is the point: it is what the review screen loads to show their answers.
 */
export type MatchPlayer = {
  sessionId: string;
  userId: string;
  username: string;
  profileImageUrl: string | null;
  totalScore: number;
  correctAnswers: number;
  /** Has questions they were not present for — the review screen says "left" rather than blanks. */
  leftEarly: boolean;
  isWinner: boolean;
};

export const getMatchPlayers = ({
  sessionId,
}: {
  sessionId: string;
}): Promise<MatchPlayer[]> =>
  apiService.get(`/QuizSessions/${sessionId}/match-players`);

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

/**
 * The other players in this session's match, or an empty list for single player.
 *
 * Asked on every results page, so the empty answer is the common one and is not an error. A match
 * is finished and immutable by the time anyone can see this screen, which is why it never refetches
 * on focus: nothing about a played match changes.
 */
export const useMatchPlayers = ({ sessionId }: { sessionId: string }) => {
  return useQuery({
    queryKey: ['match-players', sessionId],
    queryFn: () => getMatchPlayers({ sessionId }),
    enabled: !!sessionId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};