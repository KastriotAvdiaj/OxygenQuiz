import { useMutation, useQueryClient } from "@tanstack/react-query";
import {z} from "zod";

import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import {User} from "@/types/ApiTypes";

import { getUsersQueryOptions } from "./get-users";

export const createUserInputSchema = z.object({
    username: z.string().min(1, 'Required'),
    email: z.string().min(1, "Required").email("Invalid email"),
    role: z.string().default("User"),
    password: z.string().min(1, 'Required'),
  }
);

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createUser =({data }: {data: CreateUserInput}): Promise<User> => {
  console.log("hello");
    return api.post('/Users', data);
}

type UseCreateUserOptions = {
    mutationConfig?: MutationConfig<typeof createUser>;
};

export const useCreateUser = ({ mutationConfig }: UseCreateUserOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createUser,

    onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: getUsersQueryOptions().queryKey, });
        onSuccess?.(...args);
    },
    onError: (error, variables, context) => {
      console.error('Error creating user:', error); 
      onError?.(error, variables, context);
  },
    ...restConfig,
  })
};