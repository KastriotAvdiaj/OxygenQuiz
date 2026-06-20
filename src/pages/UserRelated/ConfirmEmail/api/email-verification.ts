import { useMutation } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";

/** Confirm an email address from the one-time token in the link. Anonymous endpoint. */
export const verifyEmail = (token: string): Promise<void> =>
  apiService.post("/Authentication/verify-email", { token });

/** Re-send the confirmation email to the currently logged-in user. */
export const resendVerification = (): Promise<void> =>
  apiService.post("/Authentication/resend-verification", {});

/**
 * Resend mutation. `throwOnError: false` keeps a failed resend from bubbling to the app-wide
 * error boundary — the caller surfaces it inline instead.
 */
export const useResendVerification = () =>
  useMutation({ mutationFn: () => resendVerification(), throwOnError: false });
