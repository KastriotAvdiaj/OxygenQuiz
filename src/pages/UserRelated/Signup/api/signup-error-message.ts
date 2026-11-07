/**
 * The sentence to show when signup fails — the server's own, wherever it put it.
 *
 * Our own rules come back in two shapes. A rule in `AuthenticationService` ("Username is already
 * taken.") is a ProblemDetails `detail`. A rule on `SignupDTO` — the password's length, or the
 * common-password blocklist (`NotACommonPasswordAttribute`) — fails model validation, and ASP.NET
 * answers with a ValidationProblemDetails: the real sentence under `errors.Password[0]`, and a
 * `title` of "One or more validation errors occurred." Reading `detail || title` showed that
 * title, which told a user with a too-common password nothing they could fix (2026-11-08).
 *
 * Every message on those attributes is written by us for the person signing up, so showing the
 * first one is safe — unlike the global toast, which hides validation text on purpose because it
 * can't know whose it is (`apiErrorMessage` in Api-client.ts).
 */
export function signupErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data as
    | { detail?: unknown; title?: unknown; errors?: unknown }
    | string
    | undefined;

  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    if (data.errors && typeof data.errors === "object") {
      const first = Object.values(data.errors as Record<string, unknown>)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .find((v): v is string => typeof v === "string" && v.trim().length > 0);
      if (first) return first.trim();
    }
    if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();
    if (typeof data.title === "string" && data.title.trim()) return data.title.trim();
  }
  return "We couldn't create your account. Please try again.";
}
