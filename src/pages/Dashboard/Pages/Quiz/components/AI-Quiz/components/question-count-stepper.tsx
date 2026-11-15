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
  // h-9 w-9 is the ≥36px touch target from docs/RESPONSIVE.md; round, per the design. No border:
  // the pill around them is the frame, and on hover a button lifts out of it onto the page colour.
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
  "text-foreground transition-colors hover:bg-background hover:text-primary " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-40";

/**
 * How many questions to ask for: − count +, grouped in one soft pill, with the unit beside it.
 *
 * <b>Grouped, not spread.</b> It was the count at the left edge and − / + at the right, held
 * together by a border. Without the border (removed 2026-11-15: it drew more attention than the
 * field is worth) the two ends read as unrelated things floating in an empty band — the one field
 * on the wizard whose parts didn't touch. Grouped, it is one control again, the usual shape of a
 * quantity stepper, and the pill (`bg-muted`, the wizard's input fill, no border) is quieter than
 * the frame was.
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
    <div className="mt-2 flex items-center gap-3 short:mt-1.5">
      <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
        <button
          type="button"
          onClick={step(-1)}
          disabled={value <= min}
          aria-label="One question fewer"
          className={cn(STEP_BUTTON_CLASSES)}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        {/* aria-live: pressing − / + changes this number, which a screen reader would
            otherwise never hear. The buttons' own labels stay static. The count carries the
            primary colour and the unit beside the pill doesn't: the number is this field's one
            piece of information (docs/quiz/question-type-color-schema.md — colour encodes
            meaning). min-w keeps the pill from changing width between 9 and 10. */}
        <span
          aria-live="polite"
          className="min-w-[2.5ch] text-center text-3xl font-bold leading-none tabular-nums text-primary short:text-2xl"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={step(1)}
          disabled={value >= max}
          aria-label="One question more"
          className={cn(STEP_BUTTON_CLASSES)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <span className="text-sm text-muted-foreground">
        {value === 1 ? "question" : "questions"}
      </span>
    </div>
  );
};
