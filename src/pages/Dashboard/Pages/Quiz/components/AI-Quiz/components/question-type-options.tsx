import { Check } from "lucide-react";

import { QuestionType } from "@/types/question-types";
import { cn } from "@/utils/cn";

/**
 * The types the wizard offers, in display order — also the order the prompt lists them in.
 */
export const ALL_AI_QUESTION_TYPES = [
  QuestionType.MultipleChoice,
  QuestionType.TrueFalse,
  QuestionType.TypeTheAnswer,
] as const;

/**
 * What a fresh wizard starts with.
 *
 * Multiple choice only, not everything. Selecting all three reads as a setting nobody chose:
 * the model splits a short quiz across three formats, and a user who wanted plain multiple
 * choice has to *deselect* twice to get it. One obvious default that you add to beats three
 * you have to prune — and it makes the type row a decision rather than a wall of ticks.
 */
export const DEFAULT_AI_QUESTION_TYPES = [QuestionType.MultipleChoice] as const;

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: "Multiple Choice",
  [QuestionType.TrueFalse]: "True / False",
  [QuestionType.TypeTheAnswer]: "Type The Answer",
};

export interface QuestionTypeOptionsProps {
  selected: QuestionType[];
  onToggle: (type: QuestionType) => void;
}

/**
 * The question types the model may use. Multi-select; at least one is required, which the
 * wizard enforces when Generate is pressed rather than by blocking the last deselection.
 *
 * Stacked rows with a tick circle rather than the pill chips this used to be. Chips wrapped to
 * two ragged lines inside the Advanced drawer and read as tags — decoration you scan — when
 * they are in fact three checkboxes. A row per type, each with a target the full width of the
 * panel and a circle that fills in, says "pick some of these" without a legend.
 *
 * `role="checkbox"` rather than `aria-pressed`: the circle *is* a checkmark, so "checked" is
 * what a screen reader should say about it. The whole row is the control, so the label needs
 * no separate `htmlFor` wiring.
 */
export const QuestionTypeOptions = ({
  selected,
  onToggle,
}: QuestionTypeOptionsProps) => (
  <div
    role="group"
    aria-label="Question types the AI may use"
    className="mt-2 grid grid-cols-1 gap-2"
  >
    {ALL_AI_QUESTION_TYPES.map((type) => {
      const active = selected.includes(type);
      return (
        <button
          key={type}
          type="button"
          role="checkbox"
          aria-checked={active}
          onClick={() => onToggle(type)}
          className={cn(
            // min-h-11 (44px): docs/RESPONSIVE.md asks ≥36px for anything tappable and
            // 40–44px for the ones that matter. These are the panel's main choice.
            "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border-2 px-3 py-2.5",
            "text-left text-sm leading-tight transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            active
              ? "border-primary bg-primary/10 font-medium text-foreground"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
        >
          <span>{QUESTION_TYPE_LABELS[type]}</span>

          {/* aria-hidden: aria-checked on the button already carries this state, and a
              screen reader announcing it twice is worse than not at all. */}
          <span
            aria-hidden
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40"
            )}
          >
            {active && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
        </button>
      );
    })}
  </div>
);
