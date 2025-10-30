import { useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";

import { multipleChoiceQuestionsQueryKey } from "./Multiple_Choice_Question/get-multiple-choice-questions";
import { trueFalseQuestionsQueryKey } from "./True_False-Question/get-true_false-questions";
import { typeTheAnswerQuestionsQueryKey } from "./Type_The_Answer-Question/get-type-the-answer-questions";
import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { QuestionType } from "@/types/question-types";

type DeleteQuestionApiDTO = {
  questionId: number;
};

export const deleteQuestion = ({ questionId }: DeleteQuestionApiDTO) => {
  return apiService.delete(`/Questions/${questionId}`);
};

// Map QuestionType enum values to their corresponding query options functions
const questionQueryKeyMap: {
  [key in QuestionType]?: QueryKey;
} = {
  [QuestionType.MultipleChoice]: multipleChoiceQuestionsQueryKey,
  [QuestionType.TrueFalse]: trueFalseQuestionsQueryKey,
  [QuestionType.TypeTheAnswer]: typeTheAnswerQuestionsQueryKey,
};

type UseDeleteQuestionOptions = {
  questionType: QuestionType; // Required for invalidation
  mutationConfig?: MutationConfig<typeof deleteQuestion>;
};

export const useDeleteQuestion = ({
  questionType,
  mutationConfig,
}: UseDeleteQuestionOptions) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (data, variables, onMutateResult, context) => {
      const queryKeyToInvalidate = questionQueryKeyMap[questionType];

      if (queryKeyToInvalidate) {
        queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
      } else {
        // Optional: Fallback invalidation or warning
        console.warn(
          `Query options mapping not found for QuestionType: ${questionType}.`
        );
        // queryClient.invalidateQueries({ queryKey: ['questions'] }); // Example fallback
      }

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
