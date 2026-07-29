import { apiService } from '@/lib/Api-client';
import type { QuizSession, QuizState, QuizSessionSummary, ResumeResult } from '../../../../types/quiz-session-types';
import { getUserSessions } from './get-user-sessions';

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
 * Finds the user's in-progress session for a quiz, if any. Used by the resume/abandon flow when
 * "you already have an active session" comes back from session creation.
 *
 * Reads the first page of the (newest-first, paginated) history — an active session is by
 * definition the most recent one, so a single page is always enough. The history endpoint itself
 * lives in ./get-user-sessions.
 */
export const findActiveSessionForQuiz = async ({
  userId,
  quizId,
}: {
  userId: string;
  quizId: number;
}): Promise<QuizSessionSummary | undefined> => {
  const { items } = await getUserSessions({ userId, page: 1, pageSize: 20 });
  return items.find((s) => s.quizId === quizId && !s.isCompleted);
};
