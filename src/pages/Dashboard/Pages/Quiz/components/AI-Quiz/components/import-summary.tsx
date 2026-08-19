import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";

import type { ParseResult } from "../parse-ai-output";

export interface ImportSummaryProps {
  result: ParseResult;
  /** Topic-mode quizzes get a fact-check nudge; source-based ones don't need one. */
  isFromTopic?: boolean;
  onStartOver?: () => void;
}

/**
 * Banner above the prefilled builder summarising what actually came through.
 *
 * Silently importing 8 of 10 questions is the failure mode this exists to prevent
 * (docs/quiz/ai-quiz-architecture.md §6). Dropped questions are listed individually with
 * their reason — a count alone would tell the user something went wrong without telling
 * them what, which is the worst of both.
 */
export const ImportSummary = ({
  result,
  isFromTopic = false,
  onStartOver,
}: ImportSummaryProps) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const hasNotices = result.dropped.length > 0 || result.difficultyFallbacks.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm">
          <p className="font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Drafted {result.questions.length} question
            {result.questions.length === 1 ? "" : "s"} — review and edit before saving.
          </p>

          {/* Topic mode had no source to check against, so the model was recalling facts and
              the characteristic failure is a confident wrong answer. No prompt fixes that;
              a human reading it does. See docs/quiz/ai-quiz-generation-plan.md §8. */}
          {isFromTopic && (
            <p className="text-muted-foreground text-xs mt-1">
              These came from the AI's own knowledge rather than a source you gave it —
              check the answers before you publish.
            </p>
          )}

          {hasNotices && (
            <ul className="text-muted-foreground text-xs mt-2 space-y-1 list-disc pl-5">
              {result.dropped.map((d) => (
                <li key={d.index}>
                  Skipped question {d.index} ({d.text.slice(0, 60)}
                  {d.text.length > 60 ? "…" : ""}): {d.reason}
                </li>
              ))}
              {result.difficultyFallbacks.length > 0 && (
                <li>
                  {result.difficultyFallbacks.length} question
                  {result.difficultyFallbacks.length === 1 ? "" : "s"} had an unrecognised
                  difficulty and fell back to the quiz's difficulty.
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onStartOver && (
            <button
              type="button"
              onClick={onStartOver}
              className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Start over
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
