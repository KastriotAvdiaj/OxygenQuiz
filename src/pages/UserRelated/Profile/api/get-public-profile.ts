import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { PublicUserProfile } from "@/types/user-types";

// Hits GET /api/users/{id}/profile (the public, safe-to-expose endpoint).
export const getPublicProfile = async (
  userId: string
): Promise<PublicUserProfile> => {
  const result = await api.get(`/users/${userId}/profile`);
  return result.data;
};

export const getPublicProfileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["publicProfile", userId],
    queryFn: () => getPublicProfile(userId),
    enabled: !!userId,
  });

export const usePublicProfile = (userId: string) =>
  useQuery(getPublicProfileQueryOptions(userId));
