import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { InstantFeedbackAnswerResult } from "../../../../types/quiz-session-types";
import { getCurrentStateQueryOptions } from "./get-current-state";

export const submitAnswerInputSchema = z.object({
  sessionId: z.string().uuid(),
  quizQuestionId: z.number().int(),
  selectedOptionId: z.number().int().optional().nullable(),
  submittedAnswer: z.string().optional().nullable(),
  isTimedOut: z.boolean().optional().default(false),
  /**
   * Think time measured on the client with performance.now() (question rendered → answer
   * submitted), in whole ms. The server validates it against its own clock and uses it for
   * scoring only, so network latency doesn't eat the speed bonus. Omit when unknown.
   */
  clientElapsedMs: z.number().int().positive().optional(),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerInputSchema>;

export const submitAnswer = ({
  data,
}: {
  data: SubmitAnswerInput;
}): Promise<InstantFeedbackAnswerResult> => {
  return apiService.post("/QuizSessions/answer", data);
};

type UseSubmitAnswerOptions = {
  mutationConfig?: MutationConfig<typeof submitAnswer>;
};

export const useSubmitAnswer = ({
  mutationConfig,
}: UseSubmitAnswerOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: submitAnswer,
    onSuccess: (data, variables, onMutateResult, context) => {
      // After submitting, the live state has changed (we are now "BetweenQuestions").
      // Invalidate the current state query to reflect this.
      queryClient.invalidateQueries({
        queryKey: getCurrentStateQueryOptions({
          sessionId: variables.data.sessionId,
        }).queryKey,
      });
      onSuccess?.(data, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
