import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { answerOptionsSchema } from "../../../Quiz/api/create-quiz";
import { MultipleChoiceQuestion } from "@/types/question-types";
import {
  myQuestionKeys,
  questionKeys,
  quizQuestionKeys,
} from "@/lib/query-keys";

export const updateMultipleChoiceQuestionInputSchema = z.object({
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

  answerOptions: answerOptionsSchema,
  allowMultipleSelections: z.boolean().default(false),
});

export type UpdateMultipleChoiceQuestionInput = z.infer<
  typeof updateMultipleChoiceQuestionInputSchema
>;

export const updateMultipleChoiceQuestion = ({
  data,
  questionId,
}: {
  data: UpdateMultipleChoiceQuestionInput;
  questionId: number;
}): Promise<MultipleChoiceQuestion> => {
  return api.put(`/questions/multiplechoice/${questionId}`, data);
};

type UseUpdateMultipleChoiceQuestionOptions = {
  mutationConfig?: MutationConfig<typeof updateMultipleChoiceQuestion>;
};

export const useUpdateMultipleChoiceQuestion = ({
  mutationConfig,
}: UseUpdateMultipleChoiceQuestionOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateMultipleChoiceQuestion,
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
