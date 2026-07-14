import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { UnspecifiedIds } from "../../../Quiz/components/Create-Quiz-Form/constants";
import { TrueFalseQuestion } from "@/types/question-types";
import { myQuestionKeys, questionKeys } from "@/lib/query-keys";

export const createTrueFalseQuestionInputSchema = z.object({
  text: z.string().min(1, "Question is required"),
  difficultyId: z
    .number()
    .int()
    .positive("Choose a difficulty")
    .optional()
    .default(UnspecifiedIds.difficultyId),
  categoryId: z
    .number()
    .int()
    .positive("Choose a category")
    .optional()
    .default(UnspecifiedIds.categoryId),
  languageId: z
    .number()
    .int()
    .positive("Choose a language")
    .optional()
    .default(UnspecifiedIds.languageId),
  visibility: z.string().optional(),
  imageUrl: z.string().optional(),
  correctAnswer: z.boolean().default(false),
});

export type CreateQuestionInput = z.infer<
  typeof createTrueFalseQuestionInputSchema
>;

export const createTrueFalseQuestion = ({
  data,
}: {
  data: CreateQuestionInput;
}): Promise<TrueFalseQuestion> => {
  return (
    console.log("data", data), apiService.post("/questions/truefalse", data)
  );
};

type UseCreateTrueFalseQuestionOptions = {
  mutationConfig?: MutationConfig<typeof createTrueFalseQuestion>;
};

export const useCreateTrueFalseQuestion = ({
  mutationConfig,
}: UseCreateTrueFalseQuestionOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createTrueFalseQuestion,
    onSuccess: (...args) => {
      // Broad roots cover admin search, typed search, and the user dashboard.
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      queryClient.invalidateQueries({ queryKey: myQuestionKeys.all });
      onSuccess?.(...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error creating question:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
