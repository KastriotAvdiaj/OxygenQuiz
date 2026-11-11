import { useState } from "react";
import { Check, CheckCircle2, Copy, Eye, Loader2, XCircle } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIndividualQuestionData } from "../../api/Multiple_Choice_Question/get-individual-question";

/** What `GET /questions/{id}` returns for any type — only the parts a preview shows. */
type PreviewQuestion = {
  text: string;
  category?: { name?: string } | string | null;
  difficulty?: { level?: string } | string | null;
  answerOptions?: { id: number; text: string; isCorrect: boolean }[];
  correctAnswer?: string | boolean;
};

const nameOf = (v: PreviewQuestion["category"] | PreviewQuestion["difficulty"]) =>
  typeof v === "string" ? v : v && ("name" in v ? v.name : "level" in v ? v.level : undefined);

export interface DuplicatePreviewProps {
  questionId: number;
  /** Take the bank's question: this row isn't saved. */
  onUseExisting: () => void;
  /** Save this one as well. */
  onSaveMine: () => void;
}

/**
 * The question a read row may duplicate, opened from its badge — so the reviewer compares the
 * two and decides: use the one already in the bank, or save theirs too. Fetched only when opened.
 */
export const DuplicatePreview = ({ questionId, onUseExisting, onSaveMine }: DuplicatePreviewProps) => {
  const [open, setOpen] = useState(false);
  const query = useIndividualQuestionData({ questionId, queryConfig: { enabled: open } });
  const q = query.data as unknown as PreviewQuestion | undefined;
  const meta = q ? [nameOf(q.category), nameOf(q.difficulty)].filter(Boolean).join(" · ") : "";

  const choose = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-sm bg-red-500/10 px-1.5 py-0.5 font-medium text-red-700 transition-colors hover:bg-red-500/20 dark:text-red-400"
        >
          Possible duplicate of #{questionId}
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">— compare</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Already in the question bank as #{questionId}</p>
        {query.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : query.isError || !q?.text ? (
          <p className="text-xs text-destructive">Couldn't load it — it may have been deleted.</p>
        ) : (
          <>
            <p className="font-medium">{q.text}</p>
            {q.answerOptions && q.answerOptions.length > 0 ? (
              <ul className="space-y-1">
                {q.answerOptions.map((o) => (
                  <li key={o.id} className="flex items-center gap-1.5 text-xs">
                    {o.isCorrect ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    {o.text}
                  </li>
                ))}
              </ul>
            ) : q.correctAnswer !== undefined ? (
              <p className="text-xs">
                Answer: <span className="font-medium">{String(q.correctAnswer)}</span>
              </p>
            ) : null}
            {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
          </>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-3 dark:border-foreground/30">
          <LiftedButton
            type="button"
            className="flex items-center gap-2 py-1 text-sm"
            onClick={() => choose(onUseExisting)}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Use #{questionId}
          </LiftedButton>
          <LiftedButton
            type="button"
            className="flex items-center gap-2 bg-muted py-1 text-sm text-foreground"
            liftColor="muted-foreground"
            onClick={() => choose(onSaveMine)}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Save mine too
          </LiftedButton>
        </div>
      </PopoverContent>
    </Popover>
  );
};
