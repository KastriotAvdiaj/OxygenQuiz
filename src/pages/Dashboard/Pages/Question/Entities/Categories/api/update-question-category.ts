import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getQuestionCategoriesQueryOptions } from "./get-question-categories";
import { QuestionCategory } from "@/types/question-types";

export const updateQuestionCategoryInputSchema = z.object({
  name: z.string().min(1, "Category is required"),
colorPalette: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color format"))
    .optional(),
  gradient: z.boolean().optional().default(false),
});

export type UpdateQuestionCategoryInput = z.infer<
  typeof updateQuestionCategoryInputSchema
>;

export const updateQuestionCategory = ({
  data,
  categoryId,
}: {
  data: UpdateQuestionCategoryInput;
  categoryId: number;
}): Promise<QuestionCategory> => {
  return api.put(`/questioncategories/${categoryId}`, data);
};

type UseUpdateQuestionCategoryOptions = {
  mutationConfig?: MutationConfig<typeof updateQuestionCategory>;
};

export const useUpdateQuestionCategory = ({
  mutationConfig,
}: UseUpdateQuestionCategoryOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateQuestionCategory,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: getQuestionCategoriesQueryOptions().queryKey,
      });
      onSuccess?.(...args);
    },
    onError: (error, variables,onMutateResult, context) => {
      console.error("Error updating question category:", error);
      onError?.(error, variables,onMutateResult, context);
    },
    ...restConfig,
  });
};