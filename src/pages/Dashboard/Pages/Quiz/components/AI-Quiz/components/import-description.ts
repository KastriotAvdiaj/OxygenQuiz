import type { ParseResult } from "../parse-ai-output";

/**
 * The few words on the import report's chip, or null when the parser dropped and changed nothing
 * — the common case. The report itself is `ImportNotices`.
 */
export const describeImport = (result: ParseResult): string | null => {
  const skipped = result.dropped.length;
  const rerated = result.difficultyFallbacks.length;
  if (skipped === 0 && rerated === 0) return null;
  const parts = [
    skipped > 0 ? `${skipped} question${skipped === 1 ? "" : "s"} skipped` : null,
    rerated > 0 ? `${rerated} difficult${rerated === 1 ? "y" : "ies"} replaced` : null,
  ];
  return parts.filter(Boolean).join(", ");
};
