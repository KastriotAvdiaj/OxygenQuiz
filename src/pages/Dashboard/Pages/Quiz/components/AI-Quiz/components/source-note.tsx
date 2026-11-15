
import { cn } from "@/utils/cn";

import type { AiGrounding } from "../../../api/generate-ai-quiz";

import { describeSource, type SourceDescription } from "./source-description";

export interface SourceNoteProps {
  /**
   * What the reply was written from (docs/quiz/ai-quiz-generation-flow.md §2e). Null when
   * grounding is off — and then this renders nothing, so the review is exactly what it was.
   */
  grounding: AiGrounding | null;
}

/** The words of a source, as the chip's opened panel shows them. */
export const SourceDetail = ({ source }: { source: SourceDescription }) => (
  <>
    <p className="min-w-0 break-words font-medium">{source.lead}</p>
    <p className="mt-1 text-xs text-muted-foreground">{source.detail}</p>
  </>
);

/** The box: on the review only when a source was down (`warn`); stories show every case. */
export const SourceNote = ({ grounding }: SourceNoteProps) => {
  const source = describeSource(grounding);
  if (!source) return null;
  const { Icon, warn, lead, detail } = source;

  return (
    <div
      role="status"
      className={cn(
        "mx-auto w-full max-w-[1600px] rounded-lg border px-4 py-3 text-sm",
        warn ? "border-amber-500/40 bg-amber-500/5" : "border-primary/30 bg-primary/5",
      )}
    >
      <p className="flex items-start gap-2 font-medium">
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            warn ? "text-amber-600 dark:text-amber-500" : "text-primary",
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 break-words">{lead}</span>
      </p>
      <p className="mt-1 pl-6 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
};
