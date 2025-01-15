import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getQuestionDifficultyQueryOptions } from "./get-question-difficulties";

type DeleteQuestionDifficultyDTO = {
    difficultyId: number
};

export const deleteQuestionDifficulty = ({ difficultyId }: DeleteQuestionDifficultyDTO) => {
    return api.delete(`/QuestionDifficulties/${difficultyId}`);
}

type UseDeleteQuestionDifficultyOptions = {
    mutationConfig?: MutationConfig<typeof deleteQuestionDifficulty>;
}

export const useDeleteQuestionDifficulty = ({ mutationConfig }: UseDeleteQuestionDifficultyOptions = {}) => {
   const queryClient = useQueryClient();

   const {onSuccess, ...restConfig} = mutationConfig || {};

   return useMutation({
       onSuccess: (...args) => {
           queryClient.invalidateQueries({
               queryKey: getQuestionDifficultyQueryOptions().queryKey
           });
           onSuccess?.(...args);
       },
         ...restConfig,
       mutationFn: deleteQuestionDifficulty
    });
}
