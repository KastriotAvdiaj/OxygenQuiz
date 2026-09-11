import { Check, History } from "lucide-react";

import { cn } from "@/utils/cn";

/**
 * draft-notices.tsx
 * -----------------
 * The two pieces of UI that make draft persistence visible: the notice that says work was
 * brought back, and the quiet marker that says it is being kept.
 *
 * <b>Restore is announced, not asked.</b> A draft is hydrated before the first render and the
 * user is told, with the undo sitting next to the sentence — rather than being stopped at a
 * modal on the way in. The reasoning is the project's own, from the AI wizard's navigation
 * guard: "confirming every exit from a form nobody has spent anything on is the kind of
 * prompt people learn to click through — which would blunt this one." A dialog that appears
 * every time you return to the builder is exactly that prompt, and the thing it protects (a
 * draft you can discard in one click) does not warrant it. See ADR 0009.
 */

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
];

/** "just now" / "3 minutes ago" / "yesterday" — the granularity a rescued draft needs. */
const describeAge = (savedAt: number): string => {
  const elapsed = Date.now() - savedAt;
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (elapsed >= ms) return formatter.format(-Math.floor(elapsed / ms), unit);
  }
  return "just now";
};

interface RestoredDraftNoticeProps {
  /** When the restored draft was written. */
  savedAt: number;
  /** Throws the draft away and empties the form. */
  onDiscard: () => void;
  /** What came back, in the user's terms — "3 questions", "your generated quiz". */
  summary?: string;
  className?: string;
}

export const RestoredDraftNotice = ({
  savedAt,
  onDiscard,
  summary,
  className,
}: RestoredDraftNoticeProps) => (
  <div
    // `status`, not `alert`: nothing has gone wrong and nothing is waiting on the user, so it
    // is announced politely rather than interrupting whatever a screen reader is saying.
    role="status"
    className={cn(
      "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm",
      className,
    )}
  >
    <History className="h-4 w-4 shrink-0 text-primary" />
    <p className="min-w-0 flex-1 text-foreground">
      Picked up where you left off
      {summary ? <span className="text-muted-foreground"> — {summary}</span> : null}
      <span className="text-muted-foreground">, saved {describeAge(savedAt)}.</span>
    </p>
    <button
      // Always `type="button"`: this renders inside the builder's <form>, where the default
      // "submit" would post a half-finished quiz instead of clearing it.
      type="button"
      onClick={onDiscard}
      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Start fresh
    </button>
  </div>
);

interface DraftSavedIndicatorProps {
  /** `null` while there is nothing stored — an untouched form, or a draft just discarded. */
  savedAt: number | null;
  className?: string;
}

/**
 * "Draft saved", small and grey.
 *
 * Deliberately not a relative time. It would be right for a few seconds and then quietly
 * wrong until the next keystroke re-rendered it, and keeping it honest would mean a timer
 * re-rendering the builder to change one word. The exact time is on the tooltip for anyone
 * who wants it.
 */
export const DraftSavedIndicator = ({
  savedAt,
  className,
}: DraftSavedIndicatorProps) => {
  if (savedAt === null) return null;

  return (
    <span
      role="status"
      title={`Saved at ${new Date(savedAt).toLocaleTimeString()}`}
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Check className="h-3 w-3" />
      Draft saved
    </span>
  );
};
