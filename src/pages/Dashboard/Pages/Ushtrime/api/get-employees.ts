import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";

export type Employee = {
    id: number;
    name: string;
surname : string;
    };

export const getEmployees = (): Promise<Employee[]> => {
  return api.get(`/employees`);
};

export const getEmployeeQueryOptions = () => {
  return queryOptions({
    queryKey: ["getEmployees"],
    queryFn: () => getEmployees(),
  });
};

type UseEmployeeOptions = {
  queryConfig?: QueryConfig<typeof getEmployeeQueryOptions>;
};

export const useEmployeeData = ({ queryConfig }: UseEmployeeOptions) => {
  return useQuery({
    ...getEmployeeQueryOptions(),
    ...queryConfig,
  });
};