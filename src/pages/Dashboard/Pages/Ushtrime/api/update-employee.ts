import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { Employee, getEmployeeQueryOptions } from "./get-employees";

export const updateEmployeeInputSchema = z.object({
  name : z.string().min(1, {message: 'Name is required'}),
    surname : z.string().min(1, {message: 'Surname is required'}),
}
);

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;

export const updateEmployee = ({ data, employeeId }: { data: UpdateEmployeeInput, employeeId: number}): Promise<Employee> => {
  return (
    console.log("data", data, employeeId),
    api.put(`/employees/${employeeId}`, data));
};

type UseUpdateEmployeeOptions = {
  mutationConfig?: MutationConfig<typeof updateEmployee>;
};

export const useUpdateEmployee = ({ mutationConfig }: UseUpdateEmployeeOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: (data, ...args) => {
      queryClient.refetchQueries({ queryKey: getEmployeeQueryOptions().queryKey });
      onSuccess?.(data, ...args);
    },
    onError: (error, variables, context) => {
      console.error('Error updating employee:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};