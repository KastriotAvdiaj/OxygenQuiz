import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getQuestionDifficultyQueryOptions } from "./get-question-difficulties";
import { QuestionDifficulty } from "@/types/question-types";

export const createQuestionDifficultyInputSchema = z.object({
  level: z.string().min(1, "Level is required"),
  weight: z
    .number()
    .min(1, { message: "Weight must be at least 1." })
    .max(100, { message: "Weight cannot be more than 100." }),
});

export type CreateQuestionDifficultyInput = z.infer<
  typeof createQuestionDifficultyInputSchema
>;

export const createQuestionDifficulty = ({
  data,
}: {
  data: CreateQuestionDifficultyInput;
}): Promise<QuestionDifficulty> => {
  return api.post("/questiondifficulties", data);
};

type UseCreateQuestionDifficultyOptions = {
  mutationConfig?: MutationConfig<typeof createQuestionDifficulty>;
};

export const useCreateQuestionDifficulty = ({
  mutationConfig,
}: UseCreateQuestionDifficultyOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createQuestionDifficulty,
    onSuccess: (newDifficulty, ...rest) => {
      const { queryKey } = getQuestionDifficultyQueryOptions();
      // Instant UI update: append the record the backend returned.
      queryClient.setQueryData<QuestionDifficulty[]>(queryKey, (old) =>
        old ? [...old, newDifficulty] : [newDifficulty]
      );
      // Background reconcile with server truth (sort order, concurrent edits).
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.(newDifficulty, ...rest);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error creating question difficulty:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
