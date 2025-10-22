import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { getUniversityQueryOptions, University } from "./get-universities";
// import { Employee, getEmployeeQueryOptions } from "./get-universities";

export const updateUniversityInputSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  city: z.string().min(1, { message: "Surname is required" }),
});

export type UpdateUniversityInput = z.infer<typeof updateUniversityInputSchema>;

export const updateUniversity = ({
  data,
  universityId,
}: {
  data: UpdateUniversityInput;
  universityId: number;
}): Promise<University> => {
  return (
    console.log("data", data, universityId),
    api.put(`/university/${universityId}`, data)
  );
};

type UseUpdateUniversityOptions = {
  mutationConfig?: MutationConfig<typeof updateUniversity>;
};

export const useUpdateUniversity = ({
  mutationConfig,
}: UseUpdateUniversityOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateUniversity,
    onSuccess: (data, ...args) => {
      queryClient.refetchQueries({
        queryKey: getUniversityQueryOptions().queryKey,
      });
      onSuccess?.(data, ...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error updating employee:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
