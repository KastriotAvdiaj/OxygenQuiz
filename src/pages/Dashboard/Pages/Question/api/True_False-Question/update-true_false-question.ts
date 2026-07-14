import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { TrueFalseQuestion } from "@/types/question-types";
import {
  myQuestionKeys,
  questionKeys,
  quizQuestionKeys,
} from "@/lib/query-keys";

export const updateTrueFalseQuestionInputSchema = z.object({
  id: z.number().int().optional(),
  text: z.string().min(1, "Question is required"),
  imageUrl: z.string().nullable().optional(),
  difficultyId: z
    .number()
    .int()
    .positive({ message: "Difficulty is required" }),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
  visibility: z.string().min(1, "Visibility is required"),

  correctAnswer: z.boolean().optional(),
});

export type UpdateTrueFalseQuestionInput = z.infer<
  typeof updateTrueFalseQuestionInputSchema
>;

export const updateTrueFalseQuestion = ({
  data,
  questionId,
}: {
  data: UpdateTrueFalseQuestionInput;
  questionId: number;
}): Promise<TrueFalseQuestion> => {
  return api.put(`/questions/truefalse/${questionId}`, data);
};

type UseUpdateTrueFalseQuestionOptions = {
  mutationConfig?: MutationConfig<typeof updateTrueFalseQuestion>;
};

export const useUpdateTrueFalseQuestion = ({
  mutationConfig,
}: UseUpdateTrueFalseQuestionOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateTrueFalseQuestion,
    onSuccess: (data, ...args) => {
      // Invalidate the broad roots; prefix matching covers every list variant
      // (admin search, typed search, user dashboard, quiz views).
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      queryClient.invalidateQueries({ queryKey: myQuestionKeys.all });
      queryClient.invalidateQueries({ queryKey: quizQuestionKeys.all });
      onSuccess?.(data, ...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error updating question:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
