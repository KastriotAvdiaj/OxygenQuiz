import { apiService } from '@/lib/Api-client';
import type { QuizSession, QuizState, QuizSessionSummary, ResumeResult } from '../../../../types/quiz-session-types';

/**
 * Resumes an existing quiz session that was interrupted but not completed.
 */
export const resumeQuizSession = ({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}): Promise<QuizSession> => {
  return apiService.post(`/quizsessions/${sessionId}/resume?userId=${userId}`);
};

/**
 * Resolves and resumes a quiz session using mathematical catch-up.
 * The backend auto-times-out any expired questions and returns
 * the correct question to resume on (or marks the quiz complete).
 */
export const resolveAndResume = ({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}): Promise<ResumeResult> => {
  return apiService.post(`/quizsessions/${sessionId}/resolve-and-resume`, { userId });
};

/**
 * Gets the live state of a quiz session (active question + time remaining).
 * Used after resuming to know where the user left off.
 */
export const getQuizSessionState = ({
  sessionId,
}: {
  sessionId: string;
}): Promise<QuizState> => {
  return apiService.get(`/quizsessions/${sessionId}/current-state`);
};

/**
 * Abandons an existing session and creates a brand new one for the same quiz.
 */
export const abandonAndRestartSession = ({
  sessionId,
  data,
}: {
  sessionId: string;
  data: { quizId: number; userId: string };
}): Promise<QuizSession> => {
  return apiService.post(`/quizsessions/${sessionId}/abandon-and-restart`, data);
};

/**
 * Fetches all sessions for a user. Used to find an active session for a specific quiz.
 */
export const getUserSessions = ({
  userId,
}: {
  userId: string;
}): Promise<QuizSessionSummary[]> => {
  return apiService.get(`/quizsessions/user/${userId}`);
};
