import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";

export type University = {
    id: number;
    name: string;
city : string;
    };

export const getUniversities = (): Promise<University[]> => {
  return api.get(`/university`);
};

export const getUniversityQueryOptions = () => {
  return queryOptions({
    queryKey: ["getUniversity"],
    queryFn: () => getUniversities(),
  });
};

type UseUniversityOptions = {
  queryConfig?: QueryConfig<typeof getUniversityQueryOptions>;
};

export const useUniversityData = ({ queryConfig }: UseUniversityOptions) => {
  return useQuery({
    ...getUniversityQueryOptions(),
    ...queryConfig,
  });
};