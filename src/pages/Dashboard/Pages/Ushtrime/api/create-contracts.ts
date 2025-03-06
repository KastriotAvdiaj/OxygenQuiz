
import {z} from 'zod'
import { api } from '@/lib/Api-client'
import { MutationConfig } from '@/lib/React-query'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Contract, getContractsQueryOptions } from './get-contracts'


export const createContractsInputSchema = z.object({
   title : z.string().min(1, {message: 'title is required'}),
   description : z.string().min(1, {message: 'description is required'}),
    employeeId : z.number().int().positive({message: 'employeeId is required'}),
})


export type CreateContractsInput = z.infer<typeof createContractsInputSchema>

export const createContracts= ({data} : {data:CreateContractsInput}): Promise<Contract> => {
    console.log(data);
    return api.post('/contracts', data);
}

type UseCreateContractsOptions = {
    mutationConfig?: MutationConfig<typeof createContracts>;
}

export const useCreateContracts = ({ mutationConfig }: UseCreateContractsOptions = {}) => {
    const queryClient = useQueryClient();

    const { onSuccess, onError, ...restConfig } = mutationConfig || {};

    return useMutation(
        {
            mutationFn: createContracts,
            onSuccess: (...args) => {
                queryClient.invalidateQueries({ queryKey: getContractsQueryOptions().queryKey });
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