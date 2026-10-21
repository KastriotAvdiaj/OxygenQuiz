import { Pencil, Trash2 } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { ConfirmationDialog } from "@/components/ui/dialog";

/**
 * The two confirmations the quiz builder asks before changing its question list. Rendered once,
 * by `QuizQuestionProvider`, so every place that removes or copies a question — the desktop list,
 * the overview's cards, the editor dialog — asks the same question in the same words. Props only:
 * the provider owns the state (docs/quiz/quiz-editing.md, "Removing a question").
 */

type RemoveQuestionDialogProps = {
  /** 1-based position of the question being removed, or null when closed. */
  number: number | null;
  /** A draft (never saved) loses its content; a saved question only leaves this quiz. */
  isDraft: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const RemoveQuestionDialog = ({ number, isDraft, onConfirm, onCancel }: RemoveQuestionDialogProps) => (
  <ConfirmationDialog
    isOpen={number !== null}
    onOpenChange={(open) => !open && onCancel()}
    icon="danger"
    title={`Remove question ${number ?? ""}?`}
    body={
      isDraft
        ? "This question hasn't been saved yet, so removing it throws away what you wrote. You can undo this until you save the quiz."
        : "It comes out of this quiz only — the question itself stays in the question bank. You can undo this until you save the quiz."
    }
    confirmButton={
      <LiftedButton
        type="button"
        className="flex items-center gap-2 bg-red-600 py-1 text-white"
        liftColor="red-700"
        onClick={onConfirm}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Remove
      </LiftedButton>
    }
  />
);

type EditCopyDialogProps = {
  /** 1-based position of the question to copy, or null when closed. */
  number: number | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export const EditCopyDialog = ({ number, onConfirm, onCancel }: EditCopyDialogProps) => (
  <ConfirmationDialog
    isOpen={number !== null}
    onOpenChange={(open) => !open && onCancel()}
    icon="info"
    title={`Edit question ${number ?? ""} for this quiz?`}
    body="This question is already saved in the question bank, and other quizzes may use it. Editing it here makes a copy that replaces it in this quiz only — the original, and every other quiz using it, stay as they are. The copy is saved as your own private question when you save the quiz."
    confirmButton={
      <LiftedButton type="button" className="flex items-center gap-2 py-1" onClick={onConfirm}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Edit a copy
      </LiftedButton>
    }
  />
);
