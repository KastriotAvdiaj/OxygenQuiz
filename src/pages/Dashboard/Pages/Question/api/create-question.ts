import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { Question } from "@/types/ApiTypes";

import { getQuestionsQueryOptions } from "./get-questions";

export const createQuestionInputSchema = z.object({
  question: z.string().min(1, 'Required'),
  difficulty: z.number().min(1, 'Required'),
  answerOptions: z.array(z.object({
    text: z.string().min(1, 'Required'),
    isCorrect: z.boolean()
  })).min(2, 'At least two answers are required')
});

export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;

export const createQuestion = ({ data }: { data: CreateQuestionInput }): Promise<Question> => {
  return api.post('/questions', data);
};

type UseCreateQuestionOptions = {
  mutationConfig?: MutationConfig<typeof createQuestion>;
};

export const useCreateQuestion = ({ mutationConfig }: UseCreateQuestionOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createQuestion,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: getQuestionsQueryOptions().queryKey });
      onSuccess?.(...args);
    },
    onError: (error, variables, context) => {
      console.error('Error creating question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};