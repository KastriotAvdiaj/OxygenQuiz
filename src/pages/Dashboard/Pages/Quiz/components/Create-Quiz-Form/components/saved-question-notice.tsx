import { Lock, Pencil } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import type { QuestionEditability } from "@/pages/Dashboard/Pages/Question/api/get-question-editability";
import { useQuiz } from "../Quiz-questions-context";

/**
 * Sits above a saved question the builder may NOT edit in place (QuestionEditRule), says which
 * rule stopped it in one line, and offers **Edit for this quiz** — a copy (edit-copy.ts). A saved
 * question that may be edited in place gets no notice: it simply opens in the editor.
 *
 * Before 2026-10-21 every saved question was read-only with nothing on screen saying why, which
 * read as a bug ("the questions seem to be locked").
 */
const reasonText = (e: QuestionEditability): string => {
  switch (e.reason) {
    case "NotYours":
      return "Another author's question.";
    case "Played":
      return "Players have answered this question — editing it would change their results.";
    case "UsedElsewhere":
      return e.otherQuizCount === 1
        ? "Another quiz uses this question too."
        : `${e.otherQuizCount} other quizzes use this question too.`;
    default:
      // The check itself failed — say so rather than invent a reason.
      return "Couldn't check whether this question can be edited here.";
  }
};

export const SavedQuestionNotice = ({
  questionId,
  editability,
  onCopied,
}: {
  questionId: number;
  /** Undefined while the server is being asked. */
  editability: QuestionEditability | undefined;
  /** Called with the copy's id once it has replaced the question. */
  onCopied?: (copyId: number) => void;
}) => {
  const { requestEditCopy } = useQuiz();

  if (!editability) {
    return (
      <p role="status" className="px-1 text-sm text-muted-foreground">
        Checking whether this question can be edited here…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-foreground/20">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{reasonText(editability)} Edit a copy for this quiz instead.</span>
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
