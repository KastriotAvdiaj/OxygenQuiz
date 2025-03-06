import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";

export type Contract = {
    id: number;
    title: string;
description : string;
employeeId : number;
    };

export const getContracts = (): Promise<Contract[]> => {
  return api.get(`/contracts`);
};

export const getContractsQueryOptions = () => {
  return queryOptions({
    queryKey: ["getContracts"],
    queryFn: () => getContracts(),
  });
};

type UseContractsOptions = {
  queryConfig?: QueryConfig<typeof getContractsQueryOptions>;
};

export const useContractsData = ({ queryConfig }: UseContractsOptions) => {
  return useQuery({
    ...getContractsQueryOptions(),
    ...queryConfig,
  });
};