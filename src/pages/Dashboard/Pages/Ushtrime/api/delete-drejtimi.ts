import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { getDrejtimiQueryOptions } from "./get-drejtimi";

type DeleteContractProp = {
    drejtimiId: number;
  };

  export const deleteDrejtimi = ({ drejtimiId }: DeleteContractProp) => {
    return api.delete(`/drejtimi/${drejtimiId}`);
  };
  
  type UseDeleteContractOptions = {
    mutationConfig?: MutationConfig<typeof deleteDrejtimi>;
  };
  
  export const useDeleteDrejtimi = ({
    mutationConfig,
  }: UseDeleteContractOptions = {}) => {
    const queryClient = useQueryClient();
  
    const { onSuccess, ...restConfig } = mutationConfig || {};
  
    return useMutation({
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: getDrejtimiQueryOptions().queryKey,
        });
        onSuccess?.(...args);
      },
      ...restConfig,
      mutationFn: deleteDrejtimi,
    });
  };
  
