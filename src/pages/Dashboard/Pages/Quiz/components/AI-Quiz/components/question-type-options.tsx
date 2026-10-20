import { AlertTriangle, Check, PenLine, X } from "lucide-react";

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

/** One answer slot in a glyph: an outlined chip in the type's colour, `filled` for the right one. */
const Slot = ({
  className,
  filled,
}: {
  className: string;
  filled?: boolean;
}) => (
  <span
    className={cn(
      "rounded-[3px] border-[1.5px] border-current",
      filled && "bg-current",
      className,
    )}
  />
);

/**
 * A small picture of what answering each type looks like — four options, two cards, a field
 * you write in — so the cards read at a glance. Drawn in `currentColor`, all three in the primary
 * colour: here they are one family of choices, so they share a colour rather than wearing the
 * builder's per-type hues (question-type-theme.ts).
 */
const TypeGlyph = ({ type }: { type: QuestionType }) => {
  switch (type) {
    case QuestionType.MultipleChoice:
      return (
        <span className="grid grid-cols-2 gap-1">
          <Slot className="h-2.5 w-6" />
          <Slot className="h-2.5 w-6" filled />
          <Slot className="h-2.5 w-6" />
          <Slot className="h-2.5 w-6" />
        </span>
      );
    case QuestionType.TrueFalse:
      return (
        <span className="flex gap-1.5">
          <span className="flex h-7 w-6 items-center justify-center rounded-[4px] border-[1.5px] border-current">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="flex h-7 w-6 items-center justify-center rounded-[4px] border-[1.5px] border-current">
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        </span>
      );
    case QuestionType.TypeTheAnswer:
      return (
        <span className="relative flex items-end pr-2.5 pt-2.5">
          <Slot className="h-3.5 w-11" />
          <PenLine
            className="absolute right-0 top-0 h-4 w-4"
            strokeWidth={2.25}
          />
        </span>
      );
  }
};

export interface QuestionTypeOptionsProps {
  selected: QuestionType[];
  onToggle: (type: QuestionType) => void;
  /** Why the selection can't be used — today only "none selected". Styled like the topic
   *  box's error (generation-input.tsx) so the two read as one family. */
  error?: string;
}

/**
 * The question types the model may use. Multi-select; at least one is required, which the
 * wizard enforces when Generate is pressed rather than by blocking the last deselection.
 *
 * Three vertical cards in a row (since 2026-10-17; stacked rows before that, pill chips before
 * those): tick circle at the top, the label, then a glyph of the type. The row of three is shorter
 * than the stack of three rows was, which matters on this screen — the Generate button has to
 * stay above the fold (`FitsTheFold` in the wizard's stories).
 *
 * No primary border on a selected card: the filled circle is the state, and the card frame
 * only firms up (`border-foreground/40`) and takes a faint muted fill.
 *
 * `role="checkbox"` rather than `aria-pressed`: the circle *is* a checkmark, so "checked" is
 * what a screen reader should say about it. The whole card is the control, so the label needs
 * no separate `htmlFor` wiring.
 */
export const QuestionTypeOptions = ({
  selected,
  onToggle,
  error,
}: QuestionTypeOptionsProps) => (
  <div className="mt-2 short:mt-1.5">
    <div
      role="group"
      aria-label="Question types the AI may use"
      aria-describedby={error ? "ai-types-error" : undefined}
      className="grid grid-cols-3 gap-2 short:gap-1.5"
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
              "flex w-full flex-col items-center gap-2 rounded-lg border px-2 pb-3 pt-2.5",
              "short:gap-1.5 short:pb-2 short:pt-2",
              "text-center text-xs leading-tight transition-colors sm:text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-foreground/40 bg-muted/50 font-medium text-foreground"
                : error
                  ? "border-destructive/60 text-muted-foreground hover:text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
            )}
          >
            {/* aria-hidden: aria-checked on the button already carries this state, and a
              screen reader announcing it twice is worse than not at all. */}
            <span
              aria-hidden
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40",
              )}
            >
              {active && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>

            {/* `flex-1`: "Multiple Choice" wraps to two lines on a phone and the others don't;
              the label cell takes the slack, so the three glyphs below still line up. */}
            <span className="flex flex-1 items-center">
              {QUESTION_TYPE_LABELS[type]}
            </span>

            {/* Fixed height so the glyphs sit on one line whatever each one's size. Dimmed when
              off, so the selected types are the ones in full colour. */}
            <span
              aria-hidden
              className={cn(
                "flex h-9 items-center justify-center text-primary transition-opacity short:h-8",
                active ? "opacity-100" : "opacity-50",
              )}
            >
              <TypeGlyph type={type} />
            </span>
          </button>
        );
      })}
    </div>
    {error && (
      <p
        id="ai-types-error"
        role="alert"
        className="text-destructive text-xs mt-1.5 flex items-center gap-1"
      >
        <AlertTriangle className="h-3 w-3 shrink-0" />
        {error}
      </p>
    )}
  </div>
);
