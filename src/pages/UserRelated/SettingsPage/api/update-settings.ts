import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { UserSettings } from "@/types/settings-types";
import { getSettingsQueryOptions } from "./get-settings";

export const updateSettings = async (
  data: UserSettings
): Promise<UserSettings> => {
  const result = await api.put("/settings", data);
  return result.data;
};

type UseUpdateSettingsOptions = {
  mutationConfig?: MutationConfig<typeof updateSettings>;
};

export const useUpdateSettings = ({
  mutationConfig,
}: UseUpdateSettingsOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (data, ...args) => {
      // Push the server's canonical copy straight into the cache.
      queryClient.setQueryData(getSettingsQueryOptions().queryKey, data);
      onSuccess?.(data, ...args);
    },
    ...restConfig,
  });
};
