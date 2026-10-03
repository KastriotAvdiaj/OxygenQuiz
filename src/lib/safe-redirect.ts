/**
 * Where `?redirectTo=` may send someone after signing in: a path on this site, or nowhere.
 *
 * The value arrives in a URL anyone can craft, so taken as-is it is an open redirect —
 * `/login?redirectTo=//evil.example` (or `/\evil.example`, which browsers read the same way)
 * signs someone in on our page and lands them on another. React Router ≤ 7.17 does not guard
 * against the backslash form (GHSA-wrjc-x8rr-h8h6), and the fix is not in v6, so the app checks
 * the value itself — and stays correct after an upgrade. See docs/auth/authentication.md.
 *
 * Accepted: a single leading `/` followed by anything that is not another `/` or `\`, with no
 * control characters (a tab or newline inside "/\t/evil.example" is stripped by the URL parser).
 * Everything else is dropped and the caller falls back to its normal destination.
 */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;               // absolute URLs, "javascript:", relative paths
  if (value.length > 1 && (value[1] === "/" || value[1] === "\\")) return null; // "//host", "/\host"
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.includes("\\")) return null;                 // no backslashes anywhere: browsers treat them as "/"
  return value;
}
