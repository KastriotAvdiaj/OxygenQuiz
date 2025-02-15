import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getQuestionLanguageQueryOptions } from "./get-question-language";

type DeleteQuestionLanguageDTO = {
    languageId: number
};

export const deleteQuestionLanguage = ({ languageId }: DeleteQuestionLanguageDTO) => {
    return api.delete(`/QuestionLanguages/${languageId}`);
}

type UseDeleteQuestionLanguageOptions = {
    mutationConfig?: MutationConfig<typeof deleteQuestionLanguage>;
}

export const useDeleteQuestionLanguage = ({ mutationConfig }: UseDeleteQuestionLanguageOptions = {}) => {
   const queryClient = useQueryClient();

   const {onSuccess, ...restConfig} = mutationConfig || {};

   return useMutation({
       onSuccess: (...args) => {
           queryClient.invalidateQueries({
               queryKey: getQuestionLanguageQueryOptions().queryKey
           });
           onSuccess?.(...args);
       },
         ...restConfig,
       mutationFn: deleteQuestionLanguage
    });
}
