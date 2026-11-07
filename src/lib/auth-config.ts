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
  /** Server's Auth:MinPasswordLength. Absent on an API older than this field. */
  minPasswordLength?: number;
};

/**
 * Used when the server doesn't say — an old API, or a failed config fetch. Matches the production
 * floor rather than the development value: guessing short would let a form accept a password the
 * server then rejects, which reads as a broken form rather than a policy.
 */
const FALLBACK_MIN_PASSWORD_LENGTH = 8;

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
 * What an unreadable config falls back to:
 *
 *  - **providers → disabled.** Hiding a button degrades gracefully, and a provider button must
 *    never render without its client id.
 *  - **invite gate → not required** (since the public launch, 2026-11-07; it was "required"
 *    while signup was invite-only). Signup is open by default now, so showing a gate on a failed
 *    fetch would stop everyone at a code nobody has. The server is the authority either way
 *    (`Signup:RequireInviteCode`, enforced inside the signup transaction): if the gate is in fact
 *    on, assuming it off lets nobody in — the form just reaches a rejection at submit.
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
    // Only an explicit `true` from the server shows the gate — see the fallbacks above.
    requireInviteCode: query.data?.requireInviteCode === true,
    google: query.data?.providers?.google ?? DISABLED,
    microsoft: query.data?.providers?.microsoft ?? DISABLED,
    /**
     * The single source for "at least N characters" anywhere in the UI. It used to be a 12
     * hand-copied into the signup form, the reset form and a zod schema, with no way to change
     * one of them for development without changing all three — and no way to notice when the
     * server's number moved.
     */
    minPasswordLength:
      query.data?.minPasswordLength ?? FALLBACK_MIN_PASSWORD_LENGTH,
    /**
     * True until the single attempt settles, then false FOREVER — `isFetched` is monotonic,
     * `isLoading` is not. Callers gate rendering on this, so a value that can flip back to true
     * lets a later fetch unmount a subtree that was already showing; if that subtree also reads
     * this hook, unmounting it settles the fetch, which remounts it, which fetches again.
     */
    isLoading: !query.isFetched,
  };
};
