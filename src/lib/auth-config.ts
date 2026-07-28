import { useQuery } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";

export type ExternalProvider = "google" | "microsoft";

type ProviderConfig = {
  enabled: boolean;
  /** Public OAuth client id — present only when the provider is enabled. */
  clientId: string | null;
};

type AuthConfig = {
  requireInviteCode: boolean;
  providers: Record<ExternalProvider, ProviderConfig>;
};

const fetchAuthConfig = (): Promise<AuthConfig> =>
  // skipErrorToast: config resolution failing (offline, rate-limited, old API) already has a
  // graceful fallback — conservative defaults below — so a global error toast is just noise.
  // timeout: nothing may render behind this call, so it must always settle. Without it a
  // hanging request leaves the signup page on its spinner indefinitely.
  apiService.get("/Authentication/auth-config", {
    skipErrorToast: true,
    timeout: 8000,
  } as any);

const DISABLED: ProviderConfig = { enabled: false, clientId: null };

/**
 * Public auth configuration: whether signup needs an invite code, and which external
 * sign-in providers (Google/Microsoft) are enabled — with their public client ids.
 * Supersedes the older `useSignupConfig` (the invite flag now rides along here).
 *
 * Defaults are conservative until the call resolves: no invite required (the server still
 * enforces the real rule on submit) and no providers (a provider button must never render
 * without its client id). `isLoading` lets the signup page hold rendering briefly so the
 * invite gate doesn't flash in after the form.
 */
export const useAuthConfig = () => {
  const query = useQuery({
    queryKey: ["auth-config"],
    queryFn: fetchAuthConfig,
    // This is immutable per deployment, several components mount the hook, and a failure has a
    // safe fallback — so it must be fetched AT MOST ONCE per page load. Every refetch trigger is
    // off deliberately: a stale/errored entry that any remount could re-fetch turned a single
    // 404 (frontend deployed ahead of the API) into a request storm against a dead endpoint.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
  });

  return {
    requireInviteCode: query.data?.requireInviteCode === true,
    google: query.data?.providers?.google ?? DISABLED,
    microsoft: query.data?.providers?.microsoft ?? DISABLED,
    /** True only while the single attempt is in flight; false forever after it settles. */
    isLoading: query.isLoading,
  };
};
