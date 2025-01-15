import { QuestionCategory } from '@/types/ApiTypes'
import {z} from 'zod'
import { api } from '@/lib/Api-client'
import { MutationConfig } from '@/lib/React-query'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getQuestionCategoriesQueryOptions } from './get-question-categories'

export const createQuestionCategoryInputSchema = z.object({
    name: z.string().min(1, 'Category is required'),
})


export type CreateQuestionCategoryInput = z.infer<typeof createQuestionCategoryInputSchema>

export const createQuestionCategory = ({data} : {data:CreateQuestionCategoryInput}): Promise<QuestionCategory> => {
    return api.post('/questioncategories', data);
}

type UseCreateQuestionCategoryOptions = {
    mutationConfig?: MutationConfig<typeof createQuestionCategory>;
}

export const useCreateQuestionCategory = ({ mutationConfig }: UseCreateQuestionCategoryOptions = {}) => {
    const queryClient = useQueryClient();

    const { onSuccess, onError, ...restConfig } = mutationConfig || {};

    return useMutation(
        {
            mutationFn: createQuestionCategory,
            onSuccess: (...args) => {
                queryClient.invalidateQueries({ queryKey: getQuestionCategoriesQueryOptions().queryKey });
                onSuccess?.(...args);
            },
            onError: (error, variables, context) => {
                console.error('Error creating question category:', error);
                onError?.(error, variables, context);
            },
            ...restConfig,
        }
    )
}