import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Quiz } from "@/types/quiz-types";
import { createQuizInputSchema } from "./create-quiz";

// Same shape as create, plus the id and the optimistic-concurrency version the
// quiz was loaded at. The backend rejects the save with 409 when the version is
// stale (someone else edited the quiz in the meantime) — see docs/quiz/quiz-editing.md.
export const updateQuizInputSchema = createQuizInputSchema.extend({
  id: z.number().int().positive(),
  version: z.number().int().positive(),
});

export type UpdateQuizInput = z.infer<typeof updateQuizInputSchema>;

export const updateQuiz = ({
  data,
}: {
  data: UpdateQuizInput;
}): Promise<Quiz> => {
  return api.put("/quiz", data);
};

/** True when the failed save was rejected because the quiz changed since it was loaded. */
export const isVersionConflictError = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 409;

type UseUpdateQuizOptions = {
  mutationConfig?: MutationConfig<typeof updateQuiz>;
};

export const useUpdateQuiz = ({
  mutationConfig,
}: UseUpdateQuizOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateQuiz,
    onSuccess: (...args) => {
      const [, variables] = args;
      // Same key families as create (["quiz", …] and ["quizzes", …]), plus this quiz's
      // question list, which the edit may have changed.
      queryClient.invalidateQueries({ queryKey: ["quiz"] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["myQuizzes"] });
      queryClient.invalidateQueries({
        queryKey: ["quizQuestions", variables.data.id],
      });
      onSuccess?.(...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error updating quiz:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
