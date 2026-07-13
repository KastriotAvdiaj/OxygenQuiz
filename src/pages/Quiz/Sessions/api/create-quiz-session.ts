import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { apiService } from '@/lib/Api-client';
import { MutationConfig } from '@/lib/React-query';
import { QuizSession } from '../../../../types/quiz-session-types';

export const createQuizSessionInputSchema = z.object({
  quizId: z.number().int().positive(),
  // In a real app, this would come from auth state, not the component.
  userId: z.string().uuid(),
  // Required to start a session for an Unlisted quiz you don't own — the share-link grant.
  // Ignored by the backend for Public quizzes and quizzes you own. See docs/quiz/quiz-visibility.md.
  shareToken: z.string().optional(),
});

export type CreateQuizSessionInput = z.infer<typeof createQuizSessionInputSchema>;

export const createQuizSession = ({ data }: { data: CreateQuizSessionInput }): Promise<QuizSession> => {
  // Bound the request so a stalled backend surfaces as an error screen instead of
  // leaving the page stuck on "Preparing your quiz..." forever.
  return apiService.post('/quizsessions', data, { timeout: 20000 });
};

type UseCreateQuizSessionOptions = {
  mutationConfig?: MutationConfig<typeof createQuizSession>;
};

export const useCreateQuizSession = ({ mutationConfig }: UseCreateQuizSessionOptions = {}) => {
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createQuizSession,
    onSuccess: (...args) => {
      // The component using this hook will receive the new session
      // and trigger the next step (fetching the first question).
      onSuccess?.(...args);
    },
    ...restConfig,
  });
};