import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Info } from "lucide-react";

import { cn } from "@/utils/cn";

import type { AiGrounding } from "../../../api/generate-ai-quiz";

export interface SourceNoteProps {
  /**
   * What the reply was written from (docs/quiz/ai-quiz-generation-flow.md §2e). Null when
   * grounding is off — and then this renders nothing, so the review is exactly what it was.
   */
  grounding: AiGrounding | null;
}

const CHECK = "Check the answers before you publish.";

/**
 * Where a grounded Topic quiz came from, shown above the overview with the other review notices
 * (`ImportNotices`, `AutoImageNotice`) and in their shape: a bordered box, an icon, a first line
 * that says it, and at most one quieter line under it.
 *
 * Three cases:
 * - **Written from an article** — named and linked, which is also the CC BY-SA attribution the
 *   content requires. Blue, like the picture notice: information, not a problem.
 * - **Wikipedia was down and the author went ahead** — amber. They were warned a step ago, but
 *   the review is where they read the questions, so it is said again here.
 * - **From memory for another reason** — no fitting article, a stub, "none of these", no source
 *   in the language. Blue, with the reason, because "why is there no source?" is the question.
 *
 * Nothing to dismiss, like the import report: it describes the questions on screen, and goes
 * when they do.
 */
export const SourceNote = ({ grounding }: SourceNoteProps) => {
  if (!grounding || (grounding.status !== "Grounded" && grounding.status !== "Ungrounded")) return null;

  const warn = grounding.status === "Ungrounded" && grounding.reason === "unavailable";
  const Icon = grounding.status === "Grounded" ? BookOpen : warn ? AlertTriangle : Info;

  let lead: ReactNode;
  let detail: string;
  if (grounding.status === "Grounded" && grounding.source) {
    const { title, url } = grounding.source;
    lead = (
      <>
        Written from the Wikipedia article{" "}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            {title}
          </a>
        ) : (
          title
        )}
      </>
    );
    detail = "Each answer is backed by a sentence from it — still worth a read before you publish.";
  } else {
    switch (grounding.reason) {
      case "unavailable":
        lead = "Wikipedia couldn't be reached, so the AI wrote these from memory";
        detail = "Expect more wrong answers than usual — check every one before you publish.";
        break;
      case "declined":
        lead = "Written from the AI's own knowledge — you chose not to use an article";
        detail = CHECK;
        break;
      case "no-source-for-language":
        lead = "Written from the AI's own knowledge — there's no source in this language yet";
        detail = CHECK;
        break;
      default:
        lead = "Written from the AI's own knowledge — no Wikipedia article fitted this topic";
        detail = CHECK;
    }
  }

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
