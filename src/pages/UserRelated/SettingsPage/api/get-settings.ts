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

/**
 * `enabled` is spelled out rather than left to `QueryConfig` because callers need it: this
 * endpoint is [Authorize]'d, and the account overlay that consumes it is mounted app-wide, so it
 * must not run for anonymous visitors. See `useSettingsForm`.
 */
export const useSettingsData = (
  queryConfig?: QueryConfig<typeof getSettingsQueryOptions> & { enabled?: boolean }
) =>
  useQuery({
    ...getSettingsQueryOptions(),
    ...queryConfig,
  });
