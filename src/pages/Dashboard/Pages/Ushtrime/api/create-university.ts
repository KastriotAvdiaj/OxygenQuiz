
import {z} from 'zod'
import { api } from '@/lib/Api-client'
import { MutationConfig } from '@/lib/React-query'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getUniversityQueryOptions, University } from './get-universities'


export const createUniversityInputSchema = z.object({
   name : z.string().min(1, {message: 'Name is required'}),
   city : z.string().min(1, {message: 'Surname is required'}),
})


export type CreateUniversityInput = z.infer<typeof createUniversityInputSchema>

export const createUniversity = ({data} : {data:CreateUniversityInput}): Promise<University> => {
    return api.post('/university', data);
}

type UseCreateUniversityOptions = {
    mutationConfig?: MutationConfig<typeof createUniversity>;
}

export const useCreateUniversity = ({ mutationConfig }: UseCreateUniversityOptions = {}) => {
    const queryClient = useQueryClient();

    const { onSuccess, onError, ...restConfig } = mutationConfig || {};

    return useMutation(
        {
            mutationFn: createUniversity,
            onSuccess: (...args) => {
                queryClient.invalidateQueries({ queryKey: getUniversityQueryOptions().queryKey });
                onSuccess?.(...args);
            },
            onError: (error, variables, context) => {
                console.error('Error creating University:', error);
                onError?.(error, variables, context);
            },
            ...restConfig,
        }
    )
}