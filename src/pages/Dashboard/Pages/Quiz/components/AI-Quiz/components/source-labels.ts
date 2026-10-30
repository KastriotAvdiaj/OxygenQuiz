/**
 * How grounding's sources are named to people. The server names them by id ("wikipedia",
 * "microsoft-learn"); an id this doesn't know is shown as it came, rather than hidden.
 */
const LABELS: Record<string, string> = {
  wikipedia: "Wikipedia",
  "microsoft-learn": "Microsoft Learn",
};

export const sourceLabel = (provider?: string | null): string =>
  LABELS[provider ?? "wikipedia"] ?? provider ?? "Wikipedia";

/** "Wikipedia", "Wikipedia and Microsoft Learn"; "The source" when nobody said which. */
export const sourceNames = (providers?: string[] | null): string => {
  const names = [...new Set((providers ?? []).map(sourceLabel))];
  return names.length === 0 ? "The source" : names.join(" and ");
};
