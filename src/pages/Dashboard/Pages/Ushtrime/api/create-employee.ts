
import {z} from 'zod'
import { api } from '@/lib/Api-client'
import { MutationConfig } from '@/lib/React-query'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Employee, getEmployeeQueryOptions } from './get-employees'


export const createEmployeeInputSchema = z.object({
   name : z.string().min(1, {message: 'Name is required'}),
   surname : z.string().min(1, {message: 'Surname is required'}),
})


export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>

export const createEmployee = ({data} : {data:CreateEmployeeInput}): Promise<Employee> => {
    return api.post('/employees', data);
}

type UseCreateEmployeeOptions = {
    mutationConfig?: MutationConfig<typeof createEmployee>;
}

export const useCreateEmployee = ({ mutationConfig }: UseCreateEmployeeOptions = {}) => {
    const queryClient = useQueryClient();

    const { onSuccess, onError, ...restConfig } = mutationConfig || {};

    return useMutation(
        {
            mutationFn: createEmployee,
            onSuccess: (...args) => {
                queryClient.invalidateQueries({ queryKey: getEmployeeQueryOptions().queryKey });
                onSuccess?.(...args);
            },
            onError: (error, variables, context) => {
                console.error('Error creating employee:', error);
                onError?.(error, variables, context);
            },
            ...restConfig,
        }
    )
}