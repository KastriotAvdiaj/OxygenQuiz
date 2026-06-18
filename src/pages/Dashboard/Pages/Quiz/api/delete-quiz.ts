import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";

type DeleteQuizDTO = {
    quizId: number;
  };

  export const deleteQuiz = ({ quizId }: DeleteQuizDTO) => {
    return api.delete(`/Quiz/${quizId}`);
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
        // Quiz lists live under two key families: ["quiz", …] (getAll + single) and
        // ["quizzes", …] (search/public/mine — what the dashboard table actually uses).
        // Invalidate both prefixes so every list refetches, plus the user-dashboard list.
        queryClient.invalidateQueries({ queryKey: ["quiz"] });
        queryClient.invalidateQueries({ queryKey: ["quizzes"] });
        queryClient.invalidateQueries({ queryKey: ["myQuizzes"] });
        onSuccess?.(...args);
      },
      ...restConfig,
      mutationFn: deleteQuiz,
    });
  };
  
