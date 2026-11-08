import * as React from "react";
import { Plus } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { TypeGlyph } from "@/pages/Dashboard/Pages/Quiz/components/AI-Quiz/components/question-type-options";
import { QuestionType } from "@/types/question-types";

export interface QuestionTypeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  questionType: QuestionType;
  label: string;
}

/**
 * One choice in the question bank's "Choose the type of question" dialog: a compact card, the
 * type's own glyph over its name — the glyph the AI and fact wizards show for the same type
 * (TypeGlyph), so a type looks the same wherever you pick it. Three sit in a row.
 *
 * An outline LiftedButton, not three blue ones: the three are equal alternatives, and three loud
 * buttons in a row would make none of them the obvious one (CLAUDE.md, button rank). The glyph
 * leads, as the icon rule asks. Forwards its ref and props, because it is the FormDrawer's
 * `DrawerTrigger asChild`.
 */
export const QuestionTypeButton = React.forwardRef<HTMLButtonElement, QuestionTypeButtonProps>(
  ({ questionType, label, ...props }, ref) => (
    <LiftedButton
      ref={ref}
      type="button"
      {...props}
      liftColor="muted"
      outerClassName="w-full"
      className="flex h-full w-full flex-col items-center justify-center gap-2.5 text-center leading-tight border border-foreground/30 bg-background px-2 py-3 text-sm text-foreground"
    >
      <span className="flex h-8 items-center" aria-hidden="true">
        <TypeGlyph type={questionType} />
      </span>
      {label}
    </LiftedButton>
  ),
);
QuestionTypeButton.displayName = "QuestionTypeButton";

/**
 * "Add a question" under an empty list — the create drawer's trigger when there is nothing yet.
 * Styled as a link, not a LiftedButton: the empty state is a hint, and the page's own "Add
 * Question" button is already the button. Muted until hovered, then the primary colour.
 * Still a `<button>`, because it opens a drawer rather than going anywhere.
 */
export const AddQuestionButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => (
  <button
    ref={ref}
    type="button"
    {...props}
    className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <Plus className="h-4 w-4" aria-hidden="true" />
    Add a question
  </button>
));
AddQuestionButton.displayName = "AddQuestionButton";
