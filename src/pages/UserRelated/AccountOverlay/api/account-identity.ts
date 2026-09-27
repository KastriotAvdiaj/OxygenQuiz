import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { resetErrorMessage } from "@/pages/UserRelated/PasswordReset/api/password-reset";

/**
 * Changing who an account is — its display name and its email address.
 * See docs/auth/account-identity-changes.md.
 *
 * Every request sets `skipErrorToast`: the forms show the server's own sentence inline ("That
 * username is taken.", "Your current password is incorrect."), and a generic toast on top of that
 * would say the same thing worse.
 */

export type AccountIdentity = {
  username: string;
  /** False for a Google/Microsoft-only account. The email change needs a password. */
  hasPassword: boolean;
  /** The address a confirmation link is waiting on, or null. */
  pendingEmail: string | null;
  /** ISO — when the display name may change again; null means now. */
  nextUsernameChangeAt: string | null;
};

export const accountIdentityKeys = {
  all: ["account-identity"] as const,
};

const quiet = { skipErrorToast: true };

export const getAccountIdentity = (): Promise<AccountIdentity> =>
  apiService.get("/Users/me/identity");

export const useAccountIdentity = () =>
  useQuery({
    queryKey: accountIdentityKeys.all,
    queryFn: getAccountIdentity,
    // The panel still renders without it — the edit buttons just wait.
    throwOnError: false,
  });

/** The server's reason, or a plain fallback. */
export const identityErrorMessage = (error: unknown) =>
  resetErrorMessage(error, "Something went wrong. Please try again.");

/**
 * Both the identity query and the signed-in user carry the name, so both refresh. Invalidating
 * rather than writing the cache: the name also shows in the header avatar menu and the profile.
 */
const useRefreshIdentity = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: accountIdentityKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["authenticated-user"] });
  };
};

export const useChangeUsername = () => {
  const refresh = useRefreshIdentity();
  return useMutation({
    mutationFn: (username: string): Promise<AccountIdentity> =>
      apiService.put("/Users/me/username", { username }, quiet),
    onSuccess: refresh,
    throwOnError: false,
  });
};

export const useRequestEmailChange = () => {
  const refresh = useRefreshIdentity();
  return useMutation({
    mutationFn: (input: { newEmail: string; currentPassword: string }): Promise<void> =>
      apiService.post("/Users/me/email-change", input, quiet),
    onSuccess: refresh,
    throwOnError: false,
  });
};

export const useCancelEmailChange = () => {
  const refresh = useRefreshIdentity();
  return useMutation({
    mutationFn: (): Promise<void> => apiService.delete("/Users/me/email-change", quiet),
    onSuccess: refresh,
    throwOnError: false,
  });
};

/** Redeem the link from the new inbox. Anonymous — it may be opened while signed out. */
export const useConfirmEmailChange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string): Promise<void> =>
      apiService.post("/Authentication/confirm-email-change", { token }, quiet),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountIdentityKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["authenticated-user"] });
    },
    throwOnError: false,
  });
};
