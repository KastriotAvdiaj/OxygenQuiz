import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { apiService } from '@/lib/Api-client';
import { MutationConfig } from '@/lib/React-query';
import { QuizSession } from '../quiz-session-types';

export const createQuizSessionInputSchema = z.object({
  quizId: z.number().int().positive(),
  // In a real app, this would come from auth state, not the component.
  // We keep it for consistency with your backend model.
  userId: z.string().uuid(), 
});

export type CreateQuizSessionInput = z.infer<typeof createQuizSessionInputSchema>;

export const createQuizSession = ({ data }: { data: CreateQuizSessionInput }): Promise<QuizSession> => {
  return apiService.post('/QuizSessions', data);
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