import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";

/**
 * Self-service account closure — the person's own "delete my account", as opposed to the
 * administrative delete on the Users dashboard. See docs/auth/account-closure.md.
 */

export type CloseAccountResponse = {
  /** ISO timestamp: when the account's personal data is scrubbed and recovery stops. */
  anonymiseAt: string;
};

export const closeMyAccount = (): Promise<CloseAccountResponse> =>
  api.post("/Users/me/closure");

export const cancelMyAccountClosure = (): Promise<void> =>
  api.delete("/Users/me/closure");

type UseCloseMyAccountOptions = {
  mutationConfig?: MutationConfig<typeof closeMyAccount>;
};

/**
 * No query invalidation here, deliberately. A closed account is soft-deleted, so every
 * authenticated read starts 404-ing — refetching `/me` would race the sign-out and surface
 * an error screen on the way to the login page. The caller signs out instead.
 */
export const useCloseMyAccount = ({ mutationConfig }: UseCloseMyAccountOptions = {}) =>
  useMutation({ ...mutationConfig, mutationFn: closeMyAccount });

type UseCancelMyAccountClosureOptions = {
  mutationConfig?: MutationConfig<typeof cancelMyAccountClosure>;
};

/**
 * Rarely reachable in practice: closing signs you out, and signing back in cancels the
 * closure on its own (AuthenticationService.LoginAsync). This exists for the case where a
 * session is still open, and so that "undo" is an explicit action rather than a side effect
 * you have to know about.
 */
export const useCancelMyAccountClosure = ({
  mutationConfig,
}: UseCancelMyAccountClosureOptions = {}) =>
  useMutation({ ...mutationConfig, mutationFn: cancelMyAccountClosure });
