import { useMutation } from '@tanstack/react-query';
import { apiService } from '@/lib/Api-client';
import { MutationConfig } from '@/lib/React-query';
import { CurrentQuestion } from '../quiz-session-types';

export const getNextQuestion = ({ sessionId }: { sessionId: string }): Promise<CurrentQuestion> => {
  return apiService.get(`/QuizSessions/${sessionId}/next-question`);
};

type UseGetNextQuestionOptions = {
  mutationConfig?: MutationConfig<typeof getNextQuestion>;
};

export const useGetNextQuestion = ({ mutationConfig }: UseGetNextQuestionOptions = {}) => {
  return useMutation({
    mutationFn: getNextQuestion,
    // The component's onSuccess will handle setting the new question state.
    ...mutationConfig,
  });
};