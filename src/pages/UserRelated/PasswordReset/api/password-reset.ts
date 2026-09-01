import { useMutation } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";

/**
 * Ask for a reset link.
 *
 * **This resolves the same way whether or not the address has an account.** The server answers
 * 200 either way on purpose — telling the caller "no such user" would turn this form into a way
 * to test whether someone has an account here. So the UI must not promise the mail was sent, only
 * that it will have been if the address is known. See docs/auth/password-reset.md.
 */
export const requestPasswordReset = (email: string): Promise<void> =>
  apiService.post("/Authentication/forgot-password", { email });

/** Redeem the one-time token from the link and set a new password. Anonymous endpoint. */
export const resetPassword = (token: string, newPassword: string): Promise<void> =>
  apiService.post("/Authentication/reset-password", { token, newPassword });

/**
 * `throwOnError: false` on both: the global default in `lib/React-query.ts` throws mutation errors
 * into the nearest error boundary, and a mistyped email or an expired link is an ordinary outcome
 * of these forms, not a crash. Both pages render the failure inline.
 */
export const useRequestPasswordReset = () =>
  useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
    throwOnError: false,
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      resetPassword(token, newPassword),
    throwOnError: false,
  });

/** Mirrors the server's rule in ResetPasswordDTO. Kept in step by hand — see the doc. */
export const MIN_PASSWORD_LENGTH = 12;
