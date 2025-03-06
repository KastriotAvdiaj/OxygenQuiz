import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { getContractsQueryOptions } from "./get-contracts";

type DeleteContractProp = {
    contractId: number;
  };

  export const deleteContract = ({ contractId }: DeleteContractProp) => {
    return api.delete(`/contracts/${contractId}`);
  };
  
  type UseDeleteContractOptions = {
    mutationConfig?: MutationConfig<typeof deleteContract>;
  };
  
  export const useDeleteContract = ({
    mutationConfig,
  }: UseDeleteContractOptions = {}) => {
    const queryClient = useQueryClient();
  
    const { onSuccess, ...restConfig } = mutationConfig || {};
  
    return useMutation({
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: getContractsQueryOptions().queryKey,
        });
        onSuccess?.(...args);
      },
      ...restConfig,
      mutationFn: deleteContract,
    });
  };
  
