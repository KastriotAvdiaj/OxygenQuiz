import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Info } from "lucide-react";

import { cn } from "@/utils/cn";

import type { AiGrounding } from "../../../api/generate-ai-quiz";

import { sourceLabel, sourceNames } from "./source-labels";

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
 * The cases:
 * - **Built from facts** — a Wikidata fact pack, linked to the query its facts came from.
 * - **Written from an article** — its source, named and linked, which is also the attribution
 *   the content's licence requires (CC BY-SA on Wikipedia, CC BY on Microsoft Learn).
 *   Blue, like the picture notice: information, not a problem.
 * - **Written from several articles** — a broad topic such as "General knowledge" (flow doc §2f).
 *   Every article is named and linked, for the same two reasons one is: the author can see what
 *   the quiz covers, and each link is that article's attribution.
 * - **A source was down and the author went ahead** — amber. They were warned a step ago, but
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
  const parts = grounding.status === "Grounded" ? (grounding.source?.parts ?? []) : [];
  if (grounding.status === "Grounded" && grounding.source && parts.length > 1) {
    lead = (
      <>
        {`Written from ${parts.length} ${sourceLabel(grounding.source.provider)} articles: `}
        {parts.map((part, index) => (
          <span key={part.url ?? part.title}>
            {index > 0 && ", "}
            {part.url ? (
              <a
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-primary"
              >
                {part.title}
              </a>
            ) : (
              part.title
            )}
          </span>
        ))}
      </>
    );
    detail = "Each answer is backed by a sentence from one of them — still worth a read before you publish.";
  } else if (grounding.status === "Grounded" && grounding.source) {
    const { title, url, provider } = grounding.source;
    const facts = provider === "wikidata";
    lead = (
      <>
        {facts
          ? "Built from Wikidata facts: "
          : `Written from the ${sourceLabel(provider)} ${provider === "microsoft-learn" ? "page" : "article"} `}
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
    detail = facts
      ? // A fact quiz has no model in it, so the thing worth checking is the wording, not the facts.
        "Every answer is a fact from that set, and the wrong options come from it too. Check the wording reads well before you publish."
      : grounding.source.wikidataFacts
        ? `Each answer is backed by a sentence from it or one of ${grounding.source.wikidataFacts} facts about it from Wikidata — still worth a read before you publish.`
        : "Each answer is backed by a sentence from it — still worth a read before you publish.";
  } else {
    switch (grounding.reason) {
      case "unavailable":
        lead = `${sourceNames(grounding.unreachable)} couldn't be reached, so the AI wrote these from memory`;
        detail = "Expect more wrong answers than usual — check every one before you publish.";
        break;
      case "declined":
        lead = "Written from the AI's own knowledge — you chose not to use an article";
        detail = CHECK;
        break;
      case "too-few-articles":
        lead = "Written from the AI's own knowledge — too few articles were found for a topic this wide";
        detail = CHECK;
        break;
      case "no-source-for-language":
        lead = "Written from the AI's own knowledge — there's no source in this language yet";
        detail = CHECK;
        break;
      default:
        lead = "Written from the AI's own knowledge — no article fitted this topic";
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
