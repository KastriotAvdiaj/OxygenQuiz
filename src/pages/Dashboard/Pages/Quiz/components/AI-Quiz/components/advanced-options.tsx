import { Label, Textarea } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { QuestionType } from "@/types/question-types";

import { QuestionCountStepper } from "./question-count-stepper";
import { QuestionTypeOptions } from "./question-type-options";

export interface AdvancedOptionsProps {
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
  allowedTypes: QuestionType[];
  onToggleType: (type: QuestionType) => void;
  /** Shown under the type cards — the only field here that can be wrong. */
  typesError?: string;
  extraInstructions: string;
  onExtraInstructionsChange: (value: string) => void;
  /** "Add images" (docs/media/media-pipeline.md, "AI-added images"). The switch shows when a
   *  handler is passed; off by default. */
  addImages?: boolean;
  onAddImagesChange?: (value: boolean) => void;
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
  typesError,
  extraInstructions,
  onExtraInstructionsChange,
  addImages = false,
  onAddImagesChange,
}: AdvancedOptionsProps) => (
  <section aria-label="Quiz details">
    {/* One column. The `md:grid-cols-2` split existed to keep two columns' worth of fields
        inside one viewport; with three controls left it would be a column of air next to a
        column of form. */}
    {/* Spacing: 32px between fields (24px on short screens — most phones count), 8px from a
        label to its control — the same 32px the card puts between the topic and this block.
        The gap between groups has to be clearly bigger than the gap inside one, or the labels
        float halfway between two controls, which is what made this read as cramped at 16px.
        No separators, here or above: one between every field was too much, and a single one
        under the topic made that the only boundary when every field is its own section. */}
    <div className="space-y-8 short:space-y-6">
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
        <QuestionTypeOptions
          selected={allowedTypes}
          onToggle={onToggleType}
          error={typesError}
        />
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
          className="mt-2"
          placeholder="e.g. focus on dates, keep it exam-style..."
          value={extraInstructions}
          onChange={(e) => onExtraInstructionsChange(e.target.value)}
        />
      </div>

      {onAddImagesChange && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="ai-add-images" className="text-sm font-medium">
              Add pictures
            </Label>
            <p id="ai-add-images-hint" className="mt-1 text-xs text-muted-foreground">
              Questions a picture helps — a flag, a landmark, a painting — get one, found on Wikimedia
              Commons or Pexels and credited. You check each one in the review.
            </p>
          </div>
          <Switch
            id="ai-add-images"
            aria-describedby="ai-add-images-hint"
            checked={addImages}
            onCheckedChange={onAddImagesChange}
            className="mt-0.5 shrink-0"
          />
        </div>
      )}
    </div>
  </section>
);
