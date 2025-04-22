import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { Question } from "@/types/ApiTypes";
import { answerOptionsSchema } from "../../../Quiz/api/create-quiz";
import { getQuestionsQueryOptions } from "./get-multiple-choice-questions";

export const updateQuestionInputSchema = z.object({
  text: z.string().min(1, "Question is required"), 
  difficultyId: z.number().int().positive({ message: "Difficulty is required" }),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
//   visibility: z.enum(["Global", "Private"]),
visibility : z.string().min(1, "Visibility is required"),
  answerOptions: answerOptionsSchema,
}
);

export type UpdateQuestionInput = z.infer<typeof updateQuestionInputSchema>;

export const updateQuestion = ({ data, questionId }: { data: UpdateQuestionInput, questionId: number}): Promise<Question> => {
  return (
    console.log("data", data, questionId),
    api.put(`/questions/${questionId}`, data));
};

type UseUpdateQuestionOptions = {
  mutationConfig?: MutationConfig<typeof updateQuestion>;
};

export const useUpdateQuestion = ({ mutationConfig }: UseUpdateQuestionOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateQuestion,
    onSuccess: (data, ...args) => {
      queryClient.refetchQueries({ queryKey: getQuestionsQueryOptions().queryKey });
      onSuccess?.(data, ...args);
    },
    onError: (error, variables, context) => {
      console.error('Error updating question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};