import { Check } from "lucide-react";

import { cn } from "@/utils/cn";

export interface StepMarkerProps {
  /** 1-based position, shown in the circle until the step is done. */
  step: number;
  title: string;
  /** Fills the circle with a tick. Derive it — don't hold it in state. */
  done?: boolean;
}

/**
 * A numbered section heading for the own-AI page's three steps.
 *
 * <b>Not a progress bar.</b> `common/Steps.tsx` exists and was the obvious candidate, but it
 * models a flow where you are on *one* step at a time and the others are elsewhere. This page
 * shows all three at once and always has — you fill in the topic, copy a prompt, leave, come
 * back and paste — so a bar across the top would be a second, competing account of where you
 * are, and would cost ~50px on a page with the same fold problem the wizard just had
 * (docs/adr/0002-quiz-creation-routes-hide-the-dashboard-header.md).
 *
 * Marking the sections in place costs one row, because two of the three already had a
 * `1.` / `2.` label doing this job in plain text.
 *
 * <b>Why number this page and not the wizard.</b> The generate path is one action, so
 * numbering it would invent a sequence. This one genuinely has ordered, dependent steps with a
 * trip through another application in the middle — the case
 * docs/quiz/ai-quiz-two-paths.md §1 calls "the middle step", and the reason it is a route of
 * its own. It is also the only place a user can get lost, since step 2 happens in another tab.
 *
 * <b>The numbering used to start in the wrong place.</b> "Copy the prompt" was labelled `1.`,
 * which quietly said that describing the quiz wasn't a step — so the first thing on the page
 * with a number on it was a button you can't usefully press yet. Describing is step 1.
 */
export const StepMarker = ({ step, title, done = false }: StepMarkerProps) => (
  <div className="flex items-center gap-2">
    {/* aria-hidden: the number is a visual index, and the accessible name below already
        says "Step 2: Copy the prompt". A screen reader reading the digit as well turns
        every heading into "2 Step 2 Copy the prompt". */}
    <span
      aria-hidden
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
        done
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground"
      )}
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step}
    </span>
    <p className="text-sm font-medium">
      <span className="sr-only">Step {step}: </span>
      {title}
    </p>
  </div>
);
