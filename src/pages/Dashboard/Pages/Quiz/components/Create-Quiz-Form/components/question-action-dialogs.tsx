import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/form";

/**
 * The two confirmations the quiz builder asks before changing its question list. Rendered once,
 * by `QuizQuestionProvider`, so every place that removes or copies a question asks the same
 * question in the same words. Props only: the provider owns the state
 * (docs/quiz/quiz-editing.md, "Removing a question").
 *
 * Kept to two short sentences each (2026-10-21): the first version explained everything and
 * read as a wall of text in a 425px dialog.
 */

type RemoveQuestionDialogProps = {
  /** 1-based position of the question being removed, or null when closed. */
  number: number | null;
  /** A draft (never saved) loses its content; a saved question only leaves this quiz. */
  isDraft: boolean;
  /** `dontAskAgain`: the box was ticked — the provider turns the setting off. */
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
};

export const RemoveQuestionDialog = ({ number, isDraft, onConfirm, onCancel }: RemoveQuestionDialogProps) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const close = () => setDontAskAgain(false);

  return (
    <ConfirmationDialog
      isOpen={number !== null}
      onOpenChange={(open) => {
        if (!open) {
          close();
          onCancel();
        }
      }}
      icon="danger"
      title={`Remove question ${number ?? ""}?`}
      body={
        isDraft
          ? "It hasn't been saved, so what you wrote is discarded. You can undo until you save."
          : "It stays in the question bank. You can undo until you save."
      }
      confirmButton={
        <LiftedButton
          type="button"
          className="flex items-center gap-2 bg-red-600 py-1 text-white"
          liftColor="red-700"
          onClick={() => {
            onConfirm(dontAskAgain);
            close();
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Remove
        </LiftedButton>
      }
    >
      {/* Safe to offer because Undo exists; Settings › Quiz turns it back on. */}
      <div className="mt-2 flex items-center gap-2">
        <Checkbox
          id="dont-ask-remove-question"
          checked={dontAskAgain}
          onCheckedChange={(v) => setDontAskAgain(v === true)}
        />
        <Label htmlFor="dont-ask-remove-question" className="text-sm font-normal text-muted-foreground">
          Don&apos;t ask again
        </Label>
      </div>
    </ConfirmationDialog>
  );
};

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
    title={`Edit a copy of question ${number ?? ""}?`}
    body="The copy replaces it in this quiz only. The original stays as it is."
    confirmButton={
      <LiftedButton type="button" className="flex items-center gap-2 py-1" onClick={onConfirm}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Edit a copy
      </LiftedButton>
    }
  />
);
