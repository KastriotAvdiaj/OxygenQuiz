import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { TrueFalseQuestion } from "@/types/ApiTypes";
import { getTrueFalseQuestionsQueryOptions } from "./get-true_false-questions";
import { UnspecifiedIds } from "../../Re-Usable-Components/constants";

export const createTrueFalseQuestionInputSchema = z.object({
  text:          z.string().min(1, "Question is required"),
  difficultyId:  z
                    .number().int().positive("Choose a difficulty")
                    .optional()
                    .default(UnspecifiedIds.difficultyId),
  categoryId:    z
                    .number().int().positive("Choose a category")
                    .optional()
                    .default(UnspecifiedIds.categoryId),
  languageId:    z
                    .number().int().positive("Choose a language")
                    .optional()
                    .default(UnspecifiedIds.languageId),
  visibility:    z.string().optional(),
  correctAnswer: z.boolean(),
}
);

export type CreateQuestionInput = z.infer<typeof createTrueFalseQuestionInputSchema>;

export const createTrueFalseQuestion = ({ data }: { data: CreateQuestionInput }): Promise<TrueFalseQuestion> => {
  return (
    console.log("data", data),
    api.post('/questions/truefalse', data));
};

type UseCreateTrueFalseQuestionOptions = {
  mutationConfig?: MutationConfig<typeof createTrueFalseQuestion>;
};

export const useCreateTrueFalseQuestion = ({ mutationConfig }: UseCreateTrueFalseQuestionOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createTrueFalseQuestion,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: getTrueFalseQuestionsQueryOptions().queryKey });
      onSuccess?.(...args);
    },
    onError: (error, variables, context) => {
      console.error('Error creating question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};