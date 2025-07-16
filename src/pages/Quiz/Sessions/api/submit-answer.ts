import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiService } from '@/lib/Api-client';
import { MutationConfig } from '@/lib/React-query';
import { AnswerResult } from '../quiz-session-types';
import { getCurrentStateQueryOptions } from './get-current-state';

export const submitAnswerInputSchema = z.object({
  sessionId: z.string().uuid(),
  quizQuestionId: z.number().int(),
  selectedOptionId: z.number().int().optional().nullable(),
  submittedAnswer: z.string().optional().nullable(),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerInputSchema>;

export const submitAnswer = ({ data }: { data: SubmitAnswerInput }): Promise<AnswerResult> => {
  return apiService.post('/QuizSessions/answer', data);
};

type UseSubmitAnswerOptions = {
  mutationConfig?: MutationConfig<typeof submitAnswer>;
};

export const useSubmitAnswer = ({ mutationConfig }: UseSubmitAnswerOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: submitAnswer,
    onSuccess: (data, variables, context) => {
      // After submitting, the live state has changed (we are now "BetweenQuestions").
      // Invalidate the current state query to reflect this.
      queryClient.invalidateQueries({ 
        queryKey: getCurrentStateQueryOptions({ sessionId: variables.data.sessionId }).queryKey 
      });
      onSuccess?.(data, variables, context);
    },
    ...restConfig,
  });
};