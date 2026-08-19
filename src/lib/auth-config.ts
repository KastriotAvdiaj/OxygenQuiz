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
  });

const DISABLED: ProviderConfig = { enabled: false, clientId: null };

/**
 * Public auth configuration: whether signup needs an invite code, and which external
 * sign-in providers (Google/Microsoft) are enabled — with their public client ids.
 * Supersedes the older `useSignupConfig` (the invite flag now rides along here).
 *
 * Both fallbacks are conservative, but in OPPOSITE directions, on purpose:
 *
 *  - **providers → disabled.** Hiding a button degrades gracefully, and a provider button must
 *    never render without its client id.
 *  - **invite gate → required.** Skipping a gate does not degrade gracefully. The server is the
 *    real authority (`Signup:RequireInviteCode`, enforced inside the signup transaction), so
 *    assuming "not required" doesn't let anyone in — it just walks them through the whole form
 *    to a rejection at submit. Asking for a code we might not need is the cheaper mistake.
 *
 * Trade-off accepted: if the gate is ever turned OFF server-side *and* this call fails, users
 * see a gate they can't pass. Revisit this default at public launch.
 *
 * `isLoading` lets the signup page hold rendering briefly so the gate doesn't flash in after
 * the form.
 */
export const useAuthConfig = () => {
  const query = useQuery({
    queryKey: ["auth-config"],
    queryFn: fetchAuthConfig,
    // This is immutable per deployment, several components mount the hook, and a failure has a
    // safe fallback — so it must be fetched AT MOST ONCE per page load. Every refetch trigger is
    // off deliberately: a single 404 (frontend deployed ahead of the API) once became a request
    // storm against a dead endpoint. See the troubleshooting entry in docs/auth/social-login.md.
    //
    // `retryOnMount: false` is the load-bearing one and is NOT redundant with `retry`/
    // `refetchOnMount`: those two do not cover a query that has errored and holds no data, which
    // React Query re-fetches whenever a new observer mounts. That is precisely our failure case,
    // and it is what let a second consumer mounting re-arm the request.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
  });

  return {
    // Fail CLOSED: anything other than an explicit `false` from the server means "show the gate".
    requireInviteCode: query.data?.requireInviteCode !== false,
    google: query.data?.providers?.google ?? DISABLED,
    microsoft: query.data?.providers?.microsoft ?? DISABLED,
    /**
     * True until the single attempt settles, then false FOREVER — `isFetched` is monotonic,
     * `isLoading` is not. Callers gate rendering on this, so a value that can flip back to true
     * lets a later fetch unmount a subtree that was already showing; if that subtree also reads
     * this hook, unmounting it settles the fetch, which remounts it, which fetches again.
     */
    isLoading: !query.isFetched,
  };
};
