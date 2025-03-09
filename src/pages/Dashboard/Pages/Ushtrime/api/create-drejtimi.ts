
import {z} from 'zod'
import { api } from '@/lib/Api-client'
import { MutationConfig } from '@/lib/React-query'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Drejtimi, getDrejtimiQueryOptions } from './get-drejtimi'


export const createDrejtimiInputSchema = z.object({
   name : z.string().min(1, {message: 'title is required'}),
   duration : z.string().min(1, {message: 'description is required'}),
    universityId : z.number().int().positive({message: 'universityId is required'}),
})


export type CreateDrejtimiInput = z.infer<typeof createDrejtimiInputSchema>

export const createDrejtimi= ({data} : {data:CreateDrejtimiInput}): Promise<Drejtimi> => {
    console.log(data);
    return api.post('/drejtimi', data);
}

type UseCreateDrejtimiOptions = {
    mutationConfig?: MutationConfig<typeof createDrejtimi>;
}

export const useCreateDrejtimi = ({ mutationConfig }: UseCreateDrejtimiOptions = {}) => {
    const queryClient = useQueryClient();

    const { onSuccess, onError, ...restConfig } = mutationConfig || {};

    return useMutation(
        {
            mutationFn: createDrejtimi,
            onSuccess: (...args) => {
                queryClient.invalidateQueries({ queryKey: getDrejtimiQueryOptions().queryKey });
                onSuccess?.(...args);
            },
            onError: (error, variables, context) => {
                console.error('Error creating contract:', error);
                onError?.(error, variables, context);
            },
            ...restConfig,
        }
    )
}