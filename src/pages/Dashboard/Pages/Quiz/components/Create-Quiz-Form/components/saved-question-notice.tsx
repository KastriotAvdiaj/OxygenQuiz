import { Lock, Pencil } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { useQuiz } from "../Quiz-questions-context";

/**
 * Sits above a saved question in the builder, which is shown read-only, and says why — then
 * offers the way to change it anyway: **Edit for this quiz**, which asks first and swaps the
 * question for an editable copy (edit-copy.ts). Used by the desktop builder's centre panel and
 * the overview's editor dialog, so both explain it the same way.
 *
 * It replaced nothing: before 2026-10-21 a saved question simply had no edit control, and it read
 * as a bug ("the questions seem to be locked").
 */
export const SavedQuestionNotice = ({
  questionId,
  onCopied,
}: {
  questionId: number;
  /** Called with the copy's id once it has replaced the question. */
  onCopied?: (copyId: number) => void;
}) => {
  const { requestEditCopy } = useQuiz();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-foreground/20">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          A saved question from the question bank — shown as it is. Editing it here makes a copy
          for this quiz only.
        </span>
      </p>
      <LiftedButton
        type="button"
        size="sm"
        outerClassName="shrink-0 self-start sm:self-auto"
        className="flex items-center gap-2 bg-muted text-foreground"
        liftColor="muted-foreground"
        onClick={() => requestEditCopy(questionId, onCopied)}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Edit for this quiz
      </LiftedButton>
    </div>
  );
};
