import { AlertTriangle, Check, ClipboardPaste, Copy, Plus, X } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import type { DroppedQuestion } from "../../../AI-Quiz/parse-ai-output";
import { MAX_PASTE_CHARS, MAX_PASTED_QUESTIONS } from "./paste-format";

export interface PasteQuestionsViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  onTextChange: (text: string) => void;
  onCopyFormat: () => void;
  /** Set when the clipboard refused: the format, shown so it can be copied by hand. */
  formatToCopyByHand: string | null;
  copied: boolean;
  onAdd: () => void;
  /** Why the whole paste couldn't be used, if it couldn't. */
  error: string | null;
  /** Questions that couldn't be read, with the reason — shown when nothing could be added. */
  dropped: DroppedQuestion[];
}

/**
 * The Paste questions dialog (docs/quiz/pasted-questions.md): a three-step tutorial — copy the
 * format, ask your own AI, paste its reply — and the box to paste into. Questions it adds are
 * drafts like any other, marked *Pasted — check* in the list.
 */
export const PasteQuestionsView = ({
  open,
  onOpenChange,
  text,
  onTextChange,
  onCopyFormat,
  formatToCopyByHand,
  copied,
  onAdd,
  error,
  dropped,
}: PasteQuestionsViewProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-background p-5 sm:max-w-xl dark:border border-foreground/30">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ClipboardPaste className="h-5 w-5" aria-hidden="true" />
          Paste questions
        </DialogTitle>
        <DialogDescription>
          Write or polish questions with your own AI, then paste them here.
        </DialogDescription>
      </DialogHeader>

      <ol className="mt-2 space-y-3 text-sm">
        <li className="flex gap-3">
          <StepNumber n={1} />
          <div className="min-w-0 flex-1">
            <p>Copy the format and paste it into your AI — ChatGPT, Gemini, any of them.</p>
            <LiftedButton
              type="button"
              size="sm"
              outerClassName="mt-2"
              className="flex items-center gap-1.5 bg-muted text-foreground"
              liftColor="muted-foreground"
              onClick={onCopyFormat}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy the format"}
            </LiftedButton>
            {formatToCopyByHand !== null && (
              <div className="mt-2">
                <p className="mb-1.5 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  Your browser wouldn't let us reach the clipboard. Select the format and copy it
                  yourself.
                </p>
                <Textarea
                  readOnly
                  variant="settings"
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-h-[100px] font-mono text-xs"
                  value={formatToCopyByHand}
                  aria-label="The format, to copy manually"
                />
              </div>
            )}
          </div>
        </li>
        <li className="flex gap-3">
          <StepNumber n={2} />
          <p className="min-w-0 flex-1">
            Under it, write your questions — a rough list is fine — or ask for new ones: "10
            questions about the Roman Empire". Up to {MAX_PASTED_QUESTIONS} at a time.
          </p>
        </li>
        <li className="flex gap-3">
          <StepNumber n={3} />
          <div className="min-w-0 flex-1">
            <p>Paste the AI's whole reply here.</p>
            <Textarea
              variant="settings"
              className="mt-2 min-h-[160px] font-mono text-xs"
              placeholder='{ "questions": [ ... ] }'
              value={text}
              maxLength={MAX_PASTE_CHARS}
              onChange={(e) => onTextChange(e.target.value)}
              aria-label="The AI's reply"
              aria-invalid={error !== null}
              aria-describedby={error !== null ? "paste-questions-error" : undefined}
            />
          </div>
        </li>
      </ol>

      {error !== null && (
        <div id="paste-questions-error" className="mt-1 text-sm text-destructive" role="alert">
          <p>{error}</p>
          {dropped.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs">
              {dropped.slice(0, 8).map((d) => (
                <li key={d.index}>
                  <span className="font-medium">{d.text}</span> — {d.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        They're added as new questions, only for you, marked <em>Pasted — check</em>. Look each one
        over before you save the quiz.
      </p>

      <div className="mt-1 flex flex-wrap justify-end gap-3">
        <LiftedButton
          type="button"
          className="flex items-center gap-2"
          onClick={onAdd}
          disabled={text.trim().length === 0}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add questions
        </LiftedButton>
        <LiftedButton
          type="button"
          className="flex items-center gap-2 bg-background border border-foreground/30 text-foreground"
          liftColor="muted"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </LiftedButton>
      </div>
    </DialogContent>
  </Dialog>
);

const StepNumber = ({ n }: { n: number }) => (
  <span
    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
    aria-hidden="true"
  >
    {n}
  </span>
);
