import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { TrueFalseQuestion } from "@/types/ApiTypes";
import { getTrueFalseQuestionsQueryOptions } from "./get-true_false-questions";

export const updateTrueFalseQuestionInputSchema = z.object({
  id: z.number().int().optional(), 
  text: z.string().min(1, "Question is required"),
  imageUrl: z.string().nullable().optional(), 
  difficultyId: z.number().int().positive({ message: "Difficulty is required" }),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
  visibility: z.string().min(1, "Visibility is required"),
  
  correctAnswer: z.boolean().optional(),
});

export type UpdateTrueFalseQuestionInput = z.infer<typeof updateTrueFalseQuestionInputSchema>;

export const updateTrueFalseQuestion = ({ data, questionId }: { data: UpdateTrueFalseQuestionInput, questionId: number}): Promise<TrueFalseQuestion> => {
  return (
    console.log("data", data, questionId),
    api.put(`/questions/truefalse/${questionId}`, data)
  );
};

type UseUpdateTrueFalseQuestionOptions = {
  mutationConfig?: MutationConfig<typeof updateTrueFalseQuestion>;
};

export const useUpdateTrueFalseQuestion = ({ mutationConfig }: UseUpdateTrueFalseQuestionOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateTrueFalseQuestion,
    onSuccess: (data, ...args) => {
      queryClient.refetchQueries({ queryKey: getTrueFalseQuestionsQueryOptions().queryKey });
      onSuccess?.(data, ...args);
    },
    onError: (error, variables, context) => {
      console.error('Error updating question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};