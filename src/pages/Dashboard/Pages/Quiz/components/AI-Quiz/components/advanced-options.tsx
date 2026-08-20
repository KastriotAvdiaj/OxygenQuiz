import { Input, Label, Textarea } from "@/components/ui/form";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
  QuestionType,
} from "@/types/question-types";

import { CategorySelect } from "../../../../Question/Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../../Question/Entities/Language/components/select-question-language";
import { QuestionCountStepper } from "./question-count-stepper";
import { QuestionTypeOptions } from "./question-type-options";

export interface AdvancedOptionsProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];

  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  /** null means "let the AI suggest it" — the whole point of keeping these optional. */
  categoryId: number | null;
  onCategoryIdChange: (id: number) => void;
  languageId: number | null;
  onLanguageIdChange: (id: number) => void;
  difficultyId: number | null;
  onDifficultyIdChange: (id: number) => void;
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
  allowedTypes: QuestionType[];
  onToggleType: (type: QuestionType) => void;
  extraInstructions: string;
  onExtraInstructionsChange: (value: string) => void;
}

/**
 * Everything the AI would otherwise decide, in plain sight under the topic box.
 *
 * <b>No drawer.</b> It was an accordion, then a centred dialog, then a right-hand drawer —
 * three shells for the same six fields, each one hiding them behind a click. Hiding cost more
 * than it saved: an overlay conceals its own contents by definition, so the trigger had to
 * grow a "3 set" badge to say what was behind it, and a user who never opened it had no idea
 * the knobs existed. Showing the fields deletes the badge, the open state, the focus
 * management and the story that had to click the thing open.
 *
 * <b>Two columns, one screen.</b> Stacked in one column this is a long scroll and the Generate
 * button falls off the fold, which is the problem the drawer was introduced to solve. A
 * `md:grid-cols-2` split — what the quiz *is* on the left, what the AI should *make* on the
 * right — keeps the whole form roughly one viewport tall, and collapses to a single column
 * below `md` where side-by-side fields don't fit (docs/RESPONSIVE.md).
 *
 * <b>Everything here is optional.</b> The topic above is the one thing worth filling in; each
 * field below falls back to the model's judgement, and the section header says so once rather
 * than every placeholder repeating it. Anything the user does set stops being a suggestion:
 * the container drops that vocabulary from the request, so the model can't overrule a choice
 * the human already made. See docs/quiz/ai-quiz-generation-flow.md §1a.
 *
 * <b>No draft state.</b> Fields write straight through to the container as you edit. With
 * nothing to open and nothing to close there is no Apply/Cancel to reconcile — the form is
 * simply the form.
 */
export const AdvancedOptions = ({
  categories,
  difficulties,
  languages,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  categoryId,
  onCategoryIdChange,
  languageId,
  onLanguageIdChange,
  difficultyId,
  onDifficultyIdChange,
  questionCount,
  onQuestionCountChange,
  allowedTypes,
  onToggleType,
  extraInstructions,
  onExtraInstructionsChange,
}: AdvancedOptionsProps) => (
  <section
    aria-label="Quiz details"
    className="space-y-4 border-t border-border pt-5"
  >
    {/* One statement of optionality for the whole block, so no field has to carry
        "(optional)" in its own label. The eyebrow is the twin of the "Required" one over the
        topic box — same size, same weight, same colour — because the contrast between the two
        halves of the card only reads if they are marked the same way. */}
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Optional
      </p>
      {/* Wraps to two lines on a narrow phone rather than squeezing the heading. */}
      <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-xl font-medium text-foreground">Details</h2>
        <p className="text-xs text-muted-foreground">
          Leave anything blank and the AI decides it.
        </p>
      </div>
    </div>

    <div className="grid gap-y-5 md:grid-cols-2">
      {/* ── Left: what the quiz is ─────────────────────────────────────────────── */}
      <div className="space-y-4 md:pr-6">
        <div>
          <Label htmlFor="ai-title" className="text-sm font-medium">
            Quiz title
          </Label>
          <Input
            id="ai-title"
            variant="minimal"
            className="mt-1"
            placeholder="The AI will suggest one"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="ai-description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="ai-description"
            variant="minimal"
            className="mt-1 min-h-[60px] resize-none"
            placeholder="The AI will write one"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>

        {/* The three lookups the quiz is filed under. Labelled as a set rather than left as
            a bare run of dropdowns: each select already names itself, but nothing said what
            the three of them together were for. "Classification" over "Quiz details" —
            the title and description above are quiz details too. */}
        <div className="space-y-3">
          <span className="block text-sm font-medium text-foreground">
            Classification
          </span>
          <CategorySelect
            categories={categories}
            fieldVariant="minimal"
            value={categoryId?.toString() ?? ""}
            onChange={(v: string) => onCategoryIdChange(parseInt(v, 10))}
            includeAllOption={false}
          />
          <LanguageSelect
            languages={languages}
            fieldVariant="minimal"
            value={languageId?.toString() ?? ""}
            onChange={(v: string) => onLanguageIdChange(parseInt(v, 10))}
            includeAllOption={false}
          />
          <DifficultySelect
            difficulties={difficulties}
            fieldVariant="minimal"
            value={difficultyId?.toString() ?? ""}
            onChange={(v: string) => onDifficultyIdChange(parseInt(v, 10))}
            includeAllOption={false}
          />
        </div>
      </div>

      {/* ── Right: what the AI should make ──────────────────────────────────────
          The rule is the column boundary, so it only exists once there are two columns —
          below md the sections simply follow one another. */}
      <div className="space-y-4 md:border-l md:border-border md:pl-6">
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
          {/* minimal, like the title and description opposite: `settings` is the denser
              dashboard field and looked like a different kind of control mid-form. */}
          <Input
            id="ai-extra"
            variant="minimal"
            className="mt-1"
            placeholder="e.g. focus on dates, keep it exam-style..."
            value={extraInstructions}
            onChange={(e) => onExtraInstructionsChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  </section>
);
