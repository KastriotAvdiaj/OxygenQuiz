import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";

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
/** Last resort, when the response carries nothing readable. */
export const RESET_ERROR_FALLBACK =
  "That link didn't work. Ask for a new one and try again.";

/**
 * The server's own words about why a reset failed.
 *
 * Two shapes arrive here and both matter. A bad token is an `AppValidationException` →
 * `ProblemDetails.Title` ("Invalid or expired reset link."). A rejected password is
 * `ValidationProblemDetails` from the DTO attributes, where the useful text is inside
 * `errors.NewPassword` — "Password must be at least 8 characters." or the common-password
 * refusal. The generic title on that second shape is "One or more validation errors occurred.",
 * which is worse than saying nothing, so the field message is preferred over it.
 *
 * The common-password rule is the reason this exists: it cannot be evaluated in the browser, so
 * the server's sentence is the only way the user finds out what was wrong. Reads the same keys as
 * the interceptor's `parseApiError` in `src/lib/Api-client.ts`, for the same reasons.
 * Deliberately does not show a 5xx — that text may be an exception message.
 */
export const resetErrorMessage = (error: unknown): string => {
  const response = (error as AxiosError | undefined)?.response;
  if (!response || response.status >= 500) return RESET_ERROR_FALLBACK;

  const data: unknown = response.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (!data || typeof data !== "object") return RESET_ERROR_FALLBACK;

  const body = data as Record<string, unknown>;

  const errors = body.errors;
  if (errors && typeof errors === "object") {
    const firstMessage = Object.values(errors as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .find((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (firstMessage) return firstMessage.trim();
  }

  const authored = ["detail", "title", "message"]
    .map((key) => body[key])
    .find((v): v is string => typeof v === "string" && v.trim().length > 0);

  return authored?.trim() ?? RESET_ERROR_FALLBACK;
};

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
