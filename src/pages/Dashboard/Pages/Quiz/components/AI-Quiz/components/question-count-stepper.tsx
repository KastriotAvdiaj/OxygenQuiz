import { Minus, Plus } from "lucide-react";

import { cn } from "@/utils/cn";

import { AI_QUESTION_LIMITS } from "../prompt";

export interface QuestionCountStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Defaults to the shared AI limits, so no call site can invent its own range. */
  min?: number;
  max?: number;
}

const STEP_BUTTON_CLASSES =
  // h-9 w-9 is the ≥36px touch target from docs/RESPONSIVE.md; round, per the design.
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border " +
  "text-foreground transition-colors hover:border-primary hover:bg-primary/10 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-40";

/**
 * How many questions to ask for: the count on the left, − and + on the right.
 *
 * <b>Not a number input.</b> The old `type="number"` accepted anything and then had to defend
 * itself — a NaN guard for the empty box mid-edit, a min/max the browser only enforces on
 * submit (there is no form here), and a spinner UI that differs per browser and is unusable on
 * a phone. Nobody types "13" here; they nudge the default. A stepper can only produce a legal
 * value, which deletes the whole class of problem rather than validating it.
 *
 * Clamping lives here rather than at the call site: the container holds the number and has no
 * business knowing the range. Both bounds come from `AI_QUESTION_LIMITS`, mirrored server-side
 * by `AiOptions` — the client is fast feedback, the API is the gate.
 */
export const QuestionCountStepper = ({
  value,
  onChange,
  min = AI_QUESTION_LIMITS.minQuestions,
  max = AI_QUESTION_LIMITS.maxGeneratedQuestions,
}: QuestionCountStepperProps) => {
  const step = (delta: number) => () => {
    const next = Math.min(max, Math.max(min, value + delta));
    // Guard the no-op so a click at the bound can't re-render the whole wizard.
    if (next !== value) onChange(next);
  };

  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-2">
      {/* aria-live: pressing − / + changes text elsewhere in the row, which a screen reader
          would otherwise never hear. The buttons' own labels stay static. */}
      <p aria-live="polite" className="flex items-baseline gap-1.5">
        {/* The count carries the primary colour, the unit doesn't: this row's one piece of
            information is the number, and tinting the word next to it would flatten that
            back out (docs/quiz/question-type-color-schema.md — colour encodes meaning). */}
        <span className="text-lg font-semibold tabular-nums text-primary">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">
          {value === 1 ? "question" : "questions"}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={step(-1)}
          disabled={value <= min}
          aria-label="One question fewer"
          className={cn(STEP_BUTTON_CLASSES)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={step(1)}
          disabled={value >= max}
          aria-label="One question more"
          className={cn(STEP_BUTTON_CLASSES)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
