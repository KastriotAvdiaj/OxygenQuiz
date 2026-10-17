import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ReviewBackButtonProps {
  /** Discards the questions and returns to the brief. */
  onDiscard: () => void;
  /** Sets the quiz to Draft; the button that calls it then submits the builder's form. */
  onSaveDraft: () => void;
  /** The builder's `<form>` id — the dialog is portalled outside it, so its submit names it. */
  formId: string;
  /**
   * Whether discarding costs a generation to undo. True on the generate path; false on the
   * own-AI path, where the reply can be pasted again.
   */
  costsAGeneration?: boolean;
}

/** One height and text size for all three footer buttons (widths fit their labels), so none reads as more important by accident. */
const FOOTER_BUTTON = "w-full justify-center whitespace-nowrap";

/**
 * Back from the AI review to the brief — the same chip as the wizard's Back above its form.
 *
 * The questions aren't saved yet, so going back would lose them; it asks first, and offers the
 * way to keep them: **Save as draft & leave** saves the quiz as a Draft (the normal submit, with
 * the status switched) and goes to the quiz list. Rendered by the overview rather than the
 * wizard so it can reach the form (docs/quiz/quiz-overview.md).
 *
 * Its own dialog rather than `ConfirmationDialog`, whose footer has room for one action beside
 * Cancel and sizes its Cancel differently from the action passed in — the mismatch this
 * replaced.
 */
export const ReviewBackButton = ({
  onDiscard,
  onSaveDraft,
  formId,
  costsAGeneration = true,
}: ReviewBackButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle className="pr-6">Leave without publishing?</DialogTitle>
          <DialogDescription className="text-sm text-foreground">
            These questions haven't been saved yet.{" "}
            {costsAGeneration
              ? "Discarding them means generating again to get them back."
              : "If you discard them, you can paste the reply again."}
          </DialogDescription>

          {/* One row of small buttons from `sm` up, each as wide as its label — three stacked
              full-width bars read as a menu rather than a choice, and three full-size ones in a
              row made the dialog as wide as the page. A phone can't fit three labels side by
              side, so there they stack. The keep-it option first either way: the one that
              loses nothing is the obvious one.

              `max-w-xl` and `flex-wrap`: the app font is wider than the fallback, and at
              `max-w-lg` the three labels overran the dialog, whose `overflow-y-auto` then
              showed a horizontal scrollbar. Wide enough for one row; and if a longer font or
              label ever doesn't fit, the last button wraps instead of scrolling. */}
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-end">
            <LiftedButton
              type="submit"
              form={formId}
              size="sm"
              outerClassName="w-full sm:w-auto"
              className={FOOTER_BUTTON}
              onClick={() => {
                onSaveDraft();
                setOpen(false);
              }}
            >
              Save as draft &amp; leave
            </LiftedButton>
            <LiftedButton
              type="button"
              size="sm"
              outerClassName="w-full sm:w-auto"
              liftColor="red-700"
              className={cn(FOOTER_BUTTON, "bg-red-600 text-white")}
              onClick={() => {
                setOpen(false);
                onDiscard();
              }}
            >
              Discard &amp; go back
            </LiftedButton>
            <LiftedButton
              type="button"
              size="sm"
              outerClassName="w-full sm:w-auto"
              liftColor="muted"
              className={cn(
                FOOTER_BUTTON,
                "border border-foreground/30 bg-background text-foreground",
              )}
              onClick={() => setOpen(false)}
            >
              Keep reviewing
            </LiftedButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
