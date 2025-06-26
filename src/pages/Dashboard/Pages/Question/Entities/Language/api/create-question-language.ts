import {z} from 'zod'
import { api } from '@/lib/Api-client'
import { MutationConfig } from '@/lib/React-query'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getQuestionLanguageQueryOptions } from './get-question-language'
import { QuestionLanguage } from '@/types/question-types'

export const createQuestionLanguageInputSchema = z.object({
    language: z.string().min(1, 'Category is required'),
})


export type CreateQuestionLanguageInput = z.infer<typeof createQuestionLanguageInputSchema>

export const createQuestionLanguage = ({data} : {data:CreateQuestionLanguageInput}): Promise<QuestionLanguage> => {
    return api.post('/questionlanguages', data);
}

type UseCreateQuestionLanguageOptions = {
    mutationConfig?: MutationConfig<typeof createQuestionLanguage>;
}

export const useCreateQuestionLanguage = ({ mutationConfig }: UseCreateQuestionLanguageOptions = {}) => {
    const queryClient = useQueryClient();

    const { onSuccess, onError, ...restConfig } = mutationConfig || {};

    return useMutation(
        {
            mutationFn: createQuestionLanguage,
            onSuccess: (...args) => {
                queryClient.invalidateQueries({ queryKey: getQuestionLanguageQueryOptions().queryKey });
                onSuccess?.(...args);
            },
            onError: (error, variables, context) => {
                console.error('Error creating question langauge:', error);
                onError?.(error, variables, context);
            },
            ...restConfig,
        }
    )
}