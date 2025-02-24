import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { getQuestionsQueryOptions } from "./get-questions";

type DeleteQuestionDTO = {
    questionId: number;
  };

  export const deleteQuestion = ({ questionId }: DeleteQuestionDTO) => {
    return api.delete(`/Questions/${questionId}`);
  };
  
  type UseDeleteQuestionOptions = {
    mutationConfig?: MutationConfig<typeof deleteQuestion>;
  };
  
  export const useDeleteQuestion = ({
    mutationConfig,
  }: UseDeleteQuestionOptions = {}) => {
    const queryClient = useQueryClient();
  
    const { onSuccess, ...restConfig } = mutationConfig || {};
  
    return useMutation({
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: getQuestionsQueryOptions().queryKey,
        });
        onSuccess?.(...args);
      },
      ...restConfig,
      mutationFn: deleteQuestion,
    });
  };
  
