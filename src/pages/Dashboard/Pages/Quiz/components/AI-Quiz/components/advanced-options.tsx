import { useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/cn";
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
import { WizardButton } from "./wizard-button";

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
 * Everything the AI would otherwise decide, behind a side drawer.
 *
 * It was an inline accordion first, which meant the wizard's one screen could triple in height
 * mid-thought and push the Generate button out of view. Then a dialog, which fixed that but
 * made this the one settings surface in the dashboard that opens as a centred modal — every
 * other one (`FormDrawer`, the question/quiz editors) is a right-hand drawer. Same behaviour,
 * the shell the rest of the app already uses.
 *
 * <b>One shell at every width.</b> No `matchMedia` branch to a bottom drawer on phones: the
 * fields here are controlled by the container, and switching wrappers by breakpoint either
 * mounts two copies of them (duplicate `id`s, duplicate labels) or costs a JS media query that
 * can drift from the CSS. A right drawer capped at `85vw` is already the phone layout —
 * docs/RESPONSIVE.md, "Sidebars → drawers".
 *
 * <b>No draft state.</b> Fields write straight through to the container as you edit, and the
 * footer button only closes. An Apply/Cancel pair would need a shadow copy of six values plus
 * reconciliation, to protect a decision the user can change in two clicks and confirms again
 * at review either way.
 *
 * Anything set here stops being a suggestion: the container drops that vocabulary from the
 * request, so the model can't overrule a choice the human already made. See
 * docs/quiz/ai-quiz-generation-flow.md §1a.
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
}: AdvancedOptionsProps) => {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * How many of the AI's decisions the user has taken over. Shown on the trigger because an
   * overlay hides its contents by definition — without it there's no way to tell a default
   * run from one carrying five overrides you set a minute ago and forgot.
   */
  const overrideCount = [
    title.trim(),
    description.trim(),
    categoryId,
    languageId,
    difficultyId,
    extraInstructions.trim(),
  ].filter(Boolean).length;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* asChild rather than an onClick: Radix then owns aria-expanded/aria-controls and
          returns focus to this button on close, which a hand-rolled trigger doesn't. */}
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex min-h-9 w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            Advanced
          </span>
          {overrideCount > 0 ? (
            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {overrideCount} set
            </span>
          ) : (
            // Hidden below sm: at 360px this pushes the label into a wrap.
            <span className="hidden text-xs sm:inline">The AI decides</span>
          )}
        </button>
      </DrawerTrigger>

      <DrawerContent
        ref={contentRef}
        side="right"
        // Radix focuses the first focusable descendant, which here is the title field — on a
        // phone that raises the keyboard over the panel the user opened to read. Focus the
        // content instead of nothing, so the focus trap and Escape still work.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        className={cn(
          // Header / scrolling body / footer, so the Done button can't be scrolled away.
          // p-0 replaces the variant's p-2: each band pads itself.
          "flex flex-col gap-0 p-0",
          "border-l bg-background dark:border-foreground/40",
          // The variant's `w-fit` resolves to the widest child, which for full-width children
          // is the container itself — an edge-to-edge panel on a phone. Cap it explicitly
          // (docs/RESPONSIVE.md: sheets/drawers cap at 85vw) and widen from sm up.
          "w-[85vw] max-w-[85vw] sm:w-full sm:max-w-md",
          // `inset-y-0` is measured against the *large* viewport on mobile, so the footer can
          // sit behind the browser chrome. Cap the height in dvh, with the vh fallback pair.
          "max-h-[100vh] supports-[height:100dvh]:max-h-[100dvh]"
        )}
      >
        <DrawerHeader className="space-y-1 border-b border-border px-4 py-3 pr-12 text-left">
          <DrawerTitle>Advanced</DrawerTitle>
          <DrawerDescription>
            Leave anything blank and the AI fills it in — you'll confirm
            everything in the next step.
          </DrawerDescription>
        </DrawerHeader>

        {/* The scroll region. min-h-0 so it actually shrinks inside the flex column instead of
            pushing the footer out; overscroll-contain so a flick past the end doesn't scroll
            the wizard behind the drawer (docs/RESPONSIVE.md, nested scroll regions). */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
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
              placeholder="Optional"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>

          <Separator className="bg-primary/20" />

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

          <Separator className="bg-primary/20" />

          {/* One control per band from here down, each behind its own rule. These three used
              to run together — and a stepper, a set of tick rows and a text field stacked with
              nothing between them read as one long form rather than three separate decisions.
              (The count/types pair was also `sm:grid-cols-2`, which read the *viewport*: inside
              a 28rem drawer the panel width no longer tracks the breakpoint.) */}
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

          <Separator className="bg-primary/20" />

          <div>
            <span className="block text-sm font-medium text-foreground">
              Question types
            </span>
            <QuestionTypeOptions
              selected={allowedTypes}
              onToggle={onToggleType}
            />
          </div>

          <Separator className="bg-primary/20" />

          <div>
            <Label htmlFor="ai-extra" className="text-sm font-medium">
              Extra instructions{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            {/* minimal, like the title and description above: `settings` is the denser
                dashboard field and looked like a different kind of control mid-panel. */}
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

        {/* Pinned outside the scroll region. env(safe-area-inset-bottom) clears the iOS home
            indicator, the same way the lobby's floating chat button does. */}
        <DrawerFooter className="border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:justify-end">
          <DrawerClose asChild>
            <WizardButton type="button">Done</WizardButton>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
