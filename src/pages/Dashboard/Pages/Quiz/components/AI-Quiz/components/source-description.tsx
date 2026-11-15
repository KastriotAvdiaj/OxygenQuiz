import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Info, type LucideIcon } from "lucide-react";

import type { AiGrounding } from "../../../api/generate-ai-quiz";

import { sourceLabel, sourceNames } from "./source-labels";

const CHECK = "Check the answers before you publish.";

/**
 * Where a grounded Topic quiz came from. `describeSource` works out the words; on the review they
 * sit behind a chip (`ReviewChips`) — see "Where it is shown" below.
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
 * **Where it is shown.** Until 2026-11-15 every case was a full-width box above the review, and
 * so was the picture note: two boxes on nearly every quiz, saying something routine, pushing the
 * questions down. Every case is now a chip that opens on request; the amber case — a source was
 * down — is an amber chip (`warn`), so it still stands out from the routine ones.
 *
 * Nothing to dismiss, like the import report: it describes the questions on screen, and goes
 * when they do.
 */
export interface SourceDescription {
  Icon: LucideIcon;
  /** A source was down: the one case that needs the author's attention. */
  warn: boolean;
  /** A few words for the chip. */
  chip: string;
  lead: ReactNode;
  detail: string;
}

export const describeSource = (grounding: AiGrounding | null): SourceDescription | null => {
  if (!grounding || (grounding.status !== "Grounded" && grounding.status !== "Ungrounded")) return null;

  const warn = grounding.status === "Ungrounded" && grounding.reason === "unavailable";
  const Icon = grounding.status === "Grounded" ? BookOpen : warn ? AlertTriangle : Info;

  let lead: ReactNode;
  let detail: string;
  let chip = warn ? "Written from memory — source was down" : "From the AI's own knowledge";
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
    chip = `${parts.length} ${sourceLabel(grounding.source.provider)} articles`;
  } else if (grounding.status === "Grounded" && grounding.source) {
    const { title, url, provider } = grounding.source;
    const facts = provider === "wikidata";
    chip = facts ? "Wikidata facts" : `${sourceLabel(provider)}: ${title}`;
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

  return { Icon, warn, chip, lead, detail };
};
