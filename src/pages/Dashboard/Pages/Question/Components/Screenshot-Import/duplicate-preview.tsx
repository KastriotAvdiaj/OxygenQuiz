import { useState } from "react";
import { CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIndividualQuestionData } from "../../api/Multiple_Choice_Question/get-individual-question";

/** What `GET /questions/{id}` returns for any type — only the parts a preview shows. */
type PreviewQuestion = {
  text: string;
  category?: string;
  difficulty?: string;
  answerOptions?: { id: number; text: string; isCorrect: boolean }[];
  correctAnswer?: string | boolean;
};

/**
 * The question a read row may duplicate, opened from its badge — so the reviewer compares the two
 * and decides, instead of being told "duplicate" with nothing to look at. Fetched only when opened.
 */
export const DuplicatePreview = ({ questionId }: { questionId: number }) => {
  const [open, setOpen] = useState(false);
  const query = useIndividualQuestionData({ questionId, queryConfig: { enabled: open } });
  const q = query.data as unknown as PreviewQuestion | undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-sm bg-red-500/10 px-1.5 py-0.5 font-medium text-red-700 transition-colors hover:bg-red-500/20 dark:text-red-400"
        >
          Possible duplicate of #{questionId}
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">— show it</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Already in the question bank as #{questionId}</p>
        {query.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : query.isError || !q ? (
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
            {(q.category || q.difficulty) && (
              <p className="text-xs text-muted-foreground">
                {[q.category, q.difficulty].filter(Boolean).join(" · ")}
              </p>
            )}
          </>
        )}
        <p className="border-t pt-2 text-xs text-muted-foreground dark:border-foreground/30">
          It starts unticked. Tick the row to save yours as well.
        </p>
      </PopoverContent>
    </Popover>
  );
};
