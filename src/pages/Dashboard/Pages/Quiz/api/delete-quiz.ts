import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { getQuizzesQueryOptions } from "./get-quizzes";

type DeleteQuizDTO = {
    quizId: number;
  };

  export const deleteQuiz = ({ quizId }: DeleteQuizDTO) => {
    return api.delete(`/Quizzes/${quizId}`);
  };
  
  type UseDeleteQuizOptions = {
    mutationConfig?: MutationConfig<typeof deleteQuiz>;
  };
  
  export const useDeleteQuiz = ({
    mutationConfig,
  }: UseDeleteQuizOptions = {}) => {
    const queryClient = useQueryClient();
  
    const { onSuccess, ...restConfig } = mutationConfig || {};
  
    return useMutation({
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: getQuizzesQueryOptions().queryKey,
        });
        onSuccess?.(...args);
      },
      ...restConfig,
      mutationFn: deleteQuiz,
    });
  };
  
