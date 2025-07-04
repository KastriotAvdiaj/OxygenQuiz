import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { answerOptionsSchema } from "../../../Quiz/api/create-quiz";
import { getMultipleChoiceQuestionsQueryOptions } from "./get-multiple-choice-questions";
import { MultipleChoiceQuestion } from "@/types/question-types";


export const createMultipleChoiceQuestionInputSchema = z.object({
  text: z.string().min(1, "Question is required"),
  difficultyId: z.number().int().positive({ message: "Difficulty is required" }),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
  imageUrl: z.string().optional(),
  answerOptions: answerOptionsSchema,
  allowMultipleSelections: z.boolean().default(false),
  visibility: z.string().optional().default("Global"),
});

export type CreateMultipleChoiceQuestionInput = z.infer<typeof createMultipleChoiceQuestionInputSchema>;

export const createMultipleChoiceQuestion = ({ data }: { data: CreateMultipleChoiceQuestionInput }): Promise<MultipleChoiceQuestion> => {
  return apiService.post('/questions/multiplechoice', data);
};

type UseCreateMultipleChoiceQuestionOptions = {
  mutationConfig?: MutationConfig<typeof createMultipleChoiceQuestion>;
};

export const useCreateMultipleChoiceQuestion = ({ mutationConfig }: UseCreateMultipleChoiceQuestionOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createMultipleChoiceQuestion,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: getMultipleChoiceQuestionsQueryOptions().queryKey });
      onSuccess?.(...args);
    },
    onError: (error, variables, context) => {
      console.error('Error creating multiple choice question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};