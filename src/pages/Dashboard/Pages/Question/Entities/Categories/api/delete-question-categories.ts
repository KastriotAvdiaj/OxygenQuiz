import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getQuestionCategoriesQueryOptions } from "./get-question-categories";

type DeleteQuestionCategoryDTO = {
    categoryId: number
};

export const deleteQuestionCategory = ({ categoryId }: DeleteQuestionCategoryDTO) => {
    return api.delete(`/QuestionCategories/${categoryId}`);
}

type UseDeleteQuestionCategoryOptions = {
    mutationConfig?: MutationConfig<typeof deleteQuestionCategory>;
}

export const useDeleteQuestionCategory = ({ mutationConfig }: UseDeleteQuestionCategoryOptions = {}) => {
   const queryClient = useQueryClient();

   const {onSuccess, ...restConfig} = mutationConfig || {};

   return useMutation({
       onSuccess: (...args) => {
           queryClient.invalidateQueries({
               queryKey: getQuestionCategoriesQueryOptions().queryKey
           });
           onSuccess?.(...args);
       },
         ...restConfig,
       mutationFn: deleteQuestionCategory
    });
}
