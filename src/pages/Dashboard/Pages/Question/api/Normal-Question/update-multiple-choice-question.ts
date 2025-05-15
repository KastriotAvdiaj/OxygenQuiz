import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { answerOptionsSchema } from "../../../Quiz/api/create-quiz";
import { MultipleChoiceQuestion } from "@/types/ApiTypes";
import { getMultipleChoiceQuestionsQueryOptions } from "./get-multiple-choice-questions";

export const updateMultipleChoiceQuestionInputSchema = z.object({
  id: z.number().int().optional(), 
  text: z.string().min(1, "Question is required"),
  imageUrl: z.string().nullable().optional(), 
  difficultyId: z.number().int().positive({ message: "Difficulty is required" }),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
  visibility: z.string().min(1, "Visibility is required"),
  
  answerOptions: answerOptionsSchema,
  allowMultipleSelections: z.boolean().default(false)
});

export type UpdateMultipleChoiceQuestionInput = z.infer<typeof updateMultipleChoiceQuestionInputSchema>;

export const updateMultipleChoiceQuestion = ({ data, questionId }: { data: UpdateMultipleChoiceQuestionInput, questionId: number}): Promise<MultipleChoiceQuestion> => {
  return (
    console.log("data", data, questionId),
    api.put(`/questions/multiplechoice/${questionId}`, data));
};

type UseUpdateMultipleChoiceQuestionOptions = {
  mutationConfig?: MutationConfig<typeof updateMultipleChoiceQuestion>;
};

export const useUpdateMultipleChoiceQuestion = ({ mutationConfig }: UseUpdateMultipleChoiceQuestionOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateMultipleChoiceQuestion,
    onSuccess: (data, ...args) => {
      queryClient.refetchQueries({ queryKey: getMultipleChoiceQuestionsQueryOptions().queryKey });
      onSuccess?.(data, ...args);
    },
    onError: (error, variables, context) => {
      console.error('Error updating question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};