import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";

export type Drejtimi = {
    id: number;
    name: string;
duration : string;
universityId : number;
    };

export const getDrejtimis = (): Promise<Drejtimi[]> => {
  return api.get(`/Drejtimi`);
};

export const getDrejtimiQueryOptions = () => {
  return queryOptions({
    queryKey: ["getDrejtimi"],
    queryFn: () => getDrejtimis(),
  });
};

type UseDrejtimiOptions = {
  queryConfig?: QueryConfig<typeof getDrejtimiQueryOptions>;
};

export const useDrejtimiData = ({ queryConfig }: UseDrejtimiOptions) => {
  return useQuery({
    ...getDrejtimiQueryOptions(),
    ...queryConfig,
  });
};