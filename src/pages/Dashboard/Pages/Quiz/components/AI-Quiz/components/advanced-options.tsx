import { Label, Textarea } from "@/components/ui/form";
import type { QuestionType } from "@/types/question-types";

import { QuestionCountStepper } from "./question-count-stepper";
import { QuestionTypeOptions } from "./question-type-options";

export interface AdvancedOptionsProps {
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
  allowedTypes: QuestionType[];
  onToggleType: (type: QuestionType) => void;
  extraInstructions: string;
  onExtraInstructionsChange: (value: string) => void;
}

/**
 * What the AI should make: how many questions, of which kinds, with any extra steer.
 *
 * <b>No drawer.</b> It was an accordion, then a centred dialog, then a right-hand drawer —
 * three shells for the same fields, each one hiding them behind a click. Hiding cost more
 * than it saved: an overlay conceals its own contents by definition, so the trigger had to
 * grow a "3 set" badge to say what was behind it, and a user who never opened it had no idea
 * the knobs existed. Showing the fields deletes the badge, the open state, the focus
 * management and the story that had to click the thing open.
 *
 * <b>What used to be opposite these, and why it isn't.</b> There was a second column for what
 * the quiz *is* — title, description, and a Classification group of category, language and
 * difficulty. Every one of them is a field the builder already owns and shows on the very next
 * screen, so the wizard was asking for them twice and the first ask was the one with no
 * questions in front of it to judge by. Six controls of noise in front of the one that matters,
 * which is the topic box above.
 *
 * The consequence is deliberate rather than incidental: with nothing preset, the model now
 * always proposes the category and language, and `ConfirmDetailsCard` is what asks when a
 * proposal doesn't resolve. That card stops being an edge case and becomes a normal step —
 * which is the honest place for the question, because by then there are questions on screen to
 * file. Difficulty is not asked for at all; `useAiQuizDraft` gives the quiz the median rating
 * and the builder is where it gets changed. See docs/quiz/ai-quiz-generation-flow.md §1a.
 *
 * <b>Everything here is optional.</b> The topic above is the one thing worth filling in; the
 * section header says so once rather than every placeholder repeating it.
 *
 * <b>No draft state.</b> Fields write straight through to the container as you edit. With
 * nothing to open and nothing to close there is no Apply/Cancel to reconcile — the form is
 * simply the form.
 */
export const AdvancedOptions = ({
  questionCount,
  onQuestionCountChange,
  allowedTypes,
  onToggleType,
  extraInstructions,
  onExtraInstructionsChange,
}: AdvancedOptionsProps) => (
  <section
    aria-label="Quiz details"
    className="space-y-4 border-t border-border pt-5 short:space-y-3 short:pt-3"
  >
    {/* One statement of optionality for the whole block, so no field has to carry
        "(optional)" in its own label. The eyebrow is the twin of the "Required" one over the
        topic box — same size, same weight, same colour — because the contrast between the two
        halves of the card only reads if they are marked the same way. */}
    <div>
      {/* <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Optional
      </p> */}
      {/* Wraps to two lines on a narrow phone rather than squeezing the heading. */}
      <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {/* <h2 className="text-xl font-medium text-foreground short:text-base">Details</h2> */}
        {/* <p className="text-xs text-muted-foreground">
          Leave anything blank and the AI decides it.
        </p> */}
      </div>
    </div>

    {/* One column. The `md:grid-cols-2` split existed to keep two columns' worth of fields
        inside one viewport; with three controls left it would be a column of air next to a
        column of form. */}
    <div className="space-y-4 short:space-y-3">
      <div>
        {/* A heading, not a `<Label>`: the control below is a group of buttons, so there
            is no single field for a label element to point at. Each group carries its
            own accessible name. */}
        <span className="block text-sm font-medium text-foreground">
          Number of questions
        </span>
        <QuestionCountStepper
          value={questionCount}
          onChange={onQuestionCountChange}
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-foreground">
          Question types
        </span>
        <QuestionTypeOptions selected={allowedTypes} onToggle={onToggleType} />
      </div>

      <div>
        <Label htmlFor="ai-extra" className="text-sm font-medium">
          Extra instructions
        </Label>
        {/* minimal rather than `settings`: the denser dashboard field looked like a
            different kind of control mid-form. */}
        <Textarea
          id="ai-extra"
          variant="minimal"
          className="mt-1"
          placeholder="e.g. focus on dates, keep it exam-style..."
          value={extraInstructions}
          onChange={(e) => onExtraInstructionsChange(e.target.value)}
        />
      </div>
    </div>
  </section>
);
