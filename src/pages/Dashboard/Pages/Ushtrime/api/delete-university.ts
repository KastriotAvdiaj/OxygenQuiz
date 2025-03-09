import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { getUniversityQueryOptions } from "./get-universities";

type DeleteContractProp = {
    universityId: number;
  };

  export const deleteUniversity = ({ universityId }: DeleteContractProp) => {
    return api.delete(`/university/${universityId}`);
  };
  
  type UseDeleteContractOptions = {
    mutationConfig?: MutationConfig<typeof deleteUniversity>;
  };
  
  export const useDeleteUniversity = ({
    mutationConfig,
  }: UseDeleteContractOptions = {}) => {
    const queryClient = useQueryClient();
  
    const { onSuccess, ...restConfig } = mutationConfig || {};
  
    return useMutation({
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: getUniversityQueryOptions().queryKey,
        });
        onSuccess?.(...args);
      },
      ...restConfig,
      mutationFn: deleteUniversity,
    });
  };
  
