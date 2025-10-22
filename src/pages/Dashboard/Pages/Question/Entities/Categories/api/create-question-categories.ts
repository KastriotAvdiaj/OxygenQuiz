import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getQuestionCategoriesQueryOptions } from "./get-question-categories";
import { QuestionCategory } from "@/types/question-types";

export const createQuestionCategoryInputSchema = z.object({
  name: z.string().min(1, "Category is required"),
  colorPalette: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color format"))
    .optional(),
  isGradient: z.boolean().optional().default(false),
});

export type CreateQuestionCategoryInput = z.infer<
  typeof createQuestionCategoryInputSchema
>;

export const createQuestionCategory = ({
  data,
}: {
  data: CreateQuestionCategoryInput;
}): Promise<QuestionCategory> => {
  return api.post("/questioncategories", data);
};

type UseCreateQuestionCategoryOptions = {
  mutationConfig?: MutationConfig<typeof createQuestionCategory>;
};

export const useCreateQuestionCategory = ({
  mutationConfig,
}: UseCreateQuestionCategoryOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createQuestionCategory,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: getQuestionCategoriesQueryOptions().queryKey,
      });
      onSuccess?.(...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error creating question category:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
