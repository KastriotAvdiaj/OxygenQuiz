import { useQuery } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";

type SignupConfig = {
  requireInviteCode: boolean;
};

const fetchSignupConfig = (): Promise<SignupConfig> =>
  apiService.get("/Authentication/signup-config");

/**
 * Whether signup currently requires an invite code (driven by the backend
 * Signup:RequireInviteCode flag). Lets the form show/require the invite field during a
 * gated test deployment and hide it for an open launch — with no frontend change.
 *
 * Defaults to NOT requiring a code until the config resolves, so the form stays usable
 * even if the (anonymous) config call is briefly unavailable; the server still enforces
 * the real rule on submit.
 */
export const useSignupConfig = () => {
  const query = useQuery({
    queryKey: ["signup-config"],
    queryFn: fetchSignupConfig,
    staleTime: 5 * 60_000,
    retry: false,
    throwOnError: false,
  });

  return {
    requireInviteCode: query.data?.requireInviteCode === true,
    isLoading: query.isLoading,
  };
};
