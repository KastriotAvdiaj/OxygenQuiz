import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { UserSettings } from "@/types/settings-types";

export const getSettings = async (): Promise<UserSettings> => {
  const result = await api.get("/settings");
  return result.data;
};

export const getSettingsQueryOptions = () =>
  queryOptions({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

export const useSettingsData = (
  queryConfig?: QueryConfig<typeof getSettingsQueryOptions>
) =>
  useQuery({
    ...getSettingsQueryOptions(),
    ...queryConfig,
  });
