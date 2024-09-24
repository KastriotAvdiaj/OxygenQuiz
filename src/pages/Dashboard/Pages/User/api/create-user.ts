import { useMutation, useQueryClient } from "@tanstack/react-query";
import {z} from "zod";

import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import {User} from "@/types/ApiTypes";

import { getUsersQueryOptions } from "./get-users";

export const createUserInputSchema = z.object({
    username: z.string().min(1, 'Required'),
    email: z.string().min(1, 'Required'),
    role: z.number().min(1, 'Required'),
    password: z.string().min(1, 'Required'),
  });

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createUser =({data, }: {data: CreateUserInput}): Promise<User> => {
    return api.post('/Users', data);
}

type UseCreateUserOptions = {
    mutationConfig?: MutationConfig<typeof createUser>;
};

export const useCreateUser = ({ mutationConfig, }: UseCreateUserOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, ...restConfig} = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: getUsersQueryOptions().queryKey, });
        onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: createUser,
  })
};