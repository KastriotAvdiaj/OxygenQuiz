import { Check, History } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

/**
 * draft-notices.tsx
 * -----------------
 * The UI around draft persistence: the notice that says work was brought back (the AI wizard
 * only — the manual and board builders restore silently), the quiet marker that says it is
 * being kept, and the dialog that stops an accidental exit from an unfinished quiz.
 *
 * <b>Restore is announced, not asked.</b> A draft is hydrated before the first render and the
 * user is told, with the undo sitting next to the sentence — rather than being stopped at a
 * modal on the way in. The reasoning is the project's own, from the AI wizard's navigation
 * guard: "confirming every exit from a form nobody has spent anything on is the kind of
 * prompt people learn to click through — which would blunt this one." A dialog that appears
 * every time you return to the builder is exactly that prompt, and the thing it protects (a
 * draft you can discard in one click) does not warrant it. See ADR 0009.
 */

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> =
  [
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
      {summary ? (
        <span className="text-muted-foreground"> — {summary}</span>
      ) : null}
      <span className="text-muted-foreground">
        , saved {describeAge(savedAt)}.
      </span>
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

interface LeaveUnfinishedQuizDialogProps {
  isOpen: boolean;
  /** Proceeds with the navigation that was blocked. */
  onConfirm: () => void;
  /** Stays put. Also what Escape and an overlay click do. */
  onCancel: () => void;
  /**
   * Whether the draft actually reached storage — the builder's `savedAt !== null`. It is only
   * set by a write that succeeded, so `false` means private mode, blocked site data or a full
   * store: leaving really would lose the work, and the dialog has to say so.
   */
  draftSaved: boolean;
}

/**
 * Shown when the author tries to leave the manual or board builder with typed work on it.
 * Driven by `useNavigationGuard`; a reload or tab close gets the browser's own prompt instead.
 *
 * Two short paragraphs in one style: what's at stake (the quiz doesn't exist yet), then what
 * happens to the work. That second line is only a reassurance when it's true — the draft is
 * kept in this browser for 7 days (`MAX_DRAFT_AGE_MS` in draft-storage.ts); when the write failed it becomes the
 * warning instead. Leave is red because it abandons the builder mid-task — the safe choice,
 * Keep editing, stays neutral. See docs/quiz/quiz-draft-persistence.md.
 */
export const LeaveUnfinishedQuizDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  draftSaved,
}: LeaveUnfinishedQuizDialogProps) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onOpenChange={(open) => {
      // Escape and the overlay mean "stay" — the safe reading of an ambiguous gesture.
      if (!open) onCancel();
    }}
    title="Leave this quiz unfinished?"
    cancelButtonText="Keep editing"
    confirmButton={
      <LiftedButton
        type="button"
        className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 py-1"
        liftColor="red-700"
        onClick={onConfirm}
      >
        Leave
      </LiftedButton>
    }
  >
    <div className="space-y-2">
      <p>This quiz isn't created until you finish it.</p>
      <p>
        {draftSaved
          ? "Your progress is saved in this browser for 7 days, so you can pick up where you left off."
          : "Your progress couldn't be saved in this browser, so leaving now will lose it."}
      </p>
    </div>
  </ConfirmationDialog>
);
