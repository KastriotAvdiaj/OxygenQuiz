/**
 * SignalR surfaces a server-side `HubException` as an Error whose message is the hub's own text,
 * prefixed. Strip the prefix so the UI shows the sentence the server wrote; return the fallback for
 * transport failures, which carry no useful message.
 */
export const hubErrorMessage = (err: unknown, fallback: string): string => {
  const raw = err instanceof Error ? err.message : "";
  const cleaned = raw.replace(/^.*HubException:\s*/, "").trim();
  if (!cleaned || /an unexpected error occurred/i.test(cleaned)) return fallback;
  return cleaned;
};
