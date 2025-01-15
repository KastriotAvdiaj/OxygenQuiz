import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { Question } from "@/types/ApiTypes";

import { getQuestionsQueryOptions } from "./get-questions";

export const createQuestionInputSchema = z.object({
  text: z.string().min(1, "Question is required"), 
  difficulty: z.string().min(1, "Difficulty is required"),
  category: z.string().min(1, "Category is required"),
  answerOptions: z
    .array(
      z.object({
        text: z.string().min(1, "Answer text is required"),
        isCorrect: z.boolean(),
      })
    )
    .min(2, "At least one answer option is required")
    .max(4, "No more than 4 answer options are allowed"), 
}) .refine(
  (data) => data.answerOptions.some((option) => option.isCorrect),
  {
    path: ["answerOptions"], // Points to the specific field causing the error
    message: "At least one answer option must be marked as correct",
  }
);


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