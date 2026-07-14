import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { QuestionType } from "@/types/question-types";
import {
  myQuestionKeys,
  questionKeys,
  quizQuestionKeys,
} from "@/lib/query-keys";

type DeleteQuestionApiDTO = {
  questionId: number;
};

export const deleteQuestion = ({ questionId }: DeleteQuestionApiDTO) => {
  return apiService.delete(`/Questions/${questionId}`);
};

type UseDeleteQuestionOptions = {
  /** Kept for call-site compatibility; invalidation is type-agnostic now. */
  questionType?: QuestionType;
  mutationConfig?: MutationConfig<typeof deleteQuestion>;
};

export const useDeleteQuestion = ({
  mutationConfig,
}: UseDeleteQuestionOptions) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate the broad roots; prefix matching covers every list variant
      // (admin search, typed search, user dashboard, quiz views).
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      queryClient.invalidateQueries({ queryKey: myQuestionKeys.all });
      queryClient.invalidateQueries({ queryKey: quizQuestionKeys.all });

      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      onError?.(error, variables, onMutateResult, context);
    },
    mutationFn: (variables: { questionId: number }) =>
      deleteQuestion(variables),
    ...restConfig,
  });
};
