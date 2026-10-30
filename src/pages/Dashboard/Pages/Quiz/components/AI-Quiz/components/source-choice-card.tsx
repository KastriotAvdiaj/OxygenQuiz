import { AlertTriangle, ArrowLeft, ArrowRight, ChevronRight, ExternalLink, RotateCw } from "lucide-react";

import type { ReactNode } from "react";

import { LiftedButton } from "@/common/LiftedButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/cn";

import type { AiGrounding } from "../../../api/generate-ai-quiz";

export interface SourceChoiceCardProps {
  /** The server's question — a 409 `SourceNeedsChoice`. Its `status` picks what is asked. */
  question: AiGrounding;
  /** What the author typed, quoted back so the question is about *their* topic. */
  topic: string;
  onPickLanguage: (language: string) => void;
  onPickArticle: (title: string) => void;
  /** "None of these": write from the AI's memory instead. */
  onDecline: () => void;
  /** The source was down: ask again. */
  onRetry: () => void;
  /** The source was down: go ahead from memory, knowing the cost. */
  onWriteFromMemory: () => void;
  /** Back to the form, to change the topic. Nothing is spent by leaving. */
  onEditTopic: () => void;
  /** A request is in flight (after a pick, or a retry). Choices lock until it answers. */
  busy?: boolean;
}

/** How a language is named to an Albanian-speaking audience: the English name, then its own. */
const LANGUAGE_LABELS: Record<string, { name: string; native?: string }> = {
  English: { name: "English" },
  Albanian: { name: "Albanian", native: "shqip" },
};

const numberFormat = new Intl.NumberFormat();

/**
 * A row to pick — the same bordered row as the question types in `QuestionTypeOptions`, so a
 * choice made here looks like every other choice on this screen. A chevron instead of a tick
 * circle: picking one *acts* (it generates), it doesn't toggle.
 */
const ChoiceRow = ({
  title,
  detail,
  onClick,
  disabled,
  muted = false,
}: {
  title: string;
  detail?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  muted?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      // The question-type rows' measurements: 44px, docs/RESPONSIVE.md's band for primary choices.
      // `min-w-0`: a flex item's minimum width is its content's by default, so a long title
      // ("Historia e futbollit në Kosovë") held the row at full text width on a phone and pushed
      // it, and the link beside it, out past the card. With it, `truncate` below gets to work.
      "flex min-h-11 w-full min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border-2 px-3 py-2.5",
      "text-left text-sm leading-tight transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-60",
      muted
        ? "border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
        : "border-border text-foreground hover:border-primary hover:bg-primary/10",
    )}
  >
    <span className="min-w-0">
      {/* Two lines, then an ellipsis: on a phone one line left "Historia e futb…", and the
          title is the thing being chosen. */}
      <span className={cn("block break-words line-clamp-2", !muted && "font-medium")}>{title}</span>
      {detail && <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>}
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
  </button>
);

/**
 * Grounding's questions to the author (docs/quiz/ai-quiz-generation-flow.md §2e): which
 * language, which article, or — when Wikipedia is down — whether to go ahead from memory.
 *
 * <b>Shown in the place the topic box was</b>, the same way `ConfirmDetailsCard` is, and in the
 * same frame: both are the wizard pausing to ask for one missing thing. Nothing has been spent
 * yet — the server asks before reserving any allowance — so leaving to change the topic is free,
 * and the card says so by offering it.
 *
 * <b>Why "none of these" is always on offer.</b> For some topics Wikipedia has no fitting article
 * (C# 12's new features, the rules of football in Albanian); picking the nearest wrong one would
 * ground the quiz in the wrong subject while every signal said it was sourced. Declining is the
 * honest answer, and its cost is stated where the choice is made.
 *
 * <b>Why an outage is asked about and not just reported.</b> From memory the same topics were
 * four times as likely to have a wrong answer (eval, 2026-10-29). Wikipedia is usually back within
 * a minute, so the person deciding whether that is worth waiting for is the author.
 */
export const SourceChoiceCard = ({
  question,
  topic,
  onPickLanguage,
  onPickArticle,
  onDecline,
  onRetry,
  onWriteFromMemory,
  onEditTopic,
  busy = false,
}: SourceChoiceCardProps) => {
  const quoted = topic.trim() ? `“${topic.trim()}”` : "This topic";

  const header =
    question.status === "NeedsLanguage"
      ? {
          title: "Which language is this quiz in?",
          detail: "We'll look for a source in that language, and the questions will be written in it.",
        }
      : question.status === "NeedsArticle"
        ? {
            title: "Which article should the quiz come from?",
            detail: `${quoted} matched more than one Wikipedia article. The questions will be written only from the one you pick.`,
          }
        : {
            title: "Wikipedia isn't answering",
            detail: `We couldn't reach Wikipedia to look up ${quoted}. It's usually back within a minute.`,
          };

  return (
    <Card className="bg-background border-2 border-primary/30">
      <CardHeader className="bg-primary/10 border-b border-primary/30 py-3">
        <p className="font-semibold">{header.title}</p>
        <p className="text-muted-foreground text-xs">{header.detail}</p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {question.status === "NeedsLanguage" && (
          <div role="group" aria-label="Quiz language" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(question.languages ?? ["English", "Albanian"]).map((language) => {
              const label = LANGUAGE_LABELS[language] ?? { name: language };
              return (
                <ChoiceRow
                  key={language}
                  title={label.native ? `${label.name} · ${label.native}` : label.name}
                  onClick={() => onPickLanguage(language)}
                  disabled={busy}
                />
              );
            })}
          </div>
        )}

        {question.status === "NeedsArticle" && (
          <div role="group" aria-label="Wikipedia articles" className="grid grid-cols-1 gap-2">
            {(question.articles ?? []).map((article) => (
              <div key={article.title} className="flex min-w-0 items-stretch gap-2">
                <ChoiceRow
                  title={article.title}
                  detail={
                    <>
                      {numberFormat.format(article.words)} words
                      {/* Every row says it and the header already names Wikipedia; on a phone
                          the width is worth more than the repetition. */}
                      <span className="hidden sm:inline"> · Wikipedia</span>
                    </>
                  }
                  onClick={() => onPickArticle(article.title)}
                  disabled={busy}
                />
                {/* Beside the row, not inside it: a link inside a button is invalid HTML, and
                    "let me look first" is a different action from "use this one". */}
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open “${article.title}” on Wikipedia`}
                    title="Open on Wikipedia"
                    className="flex w-11 shrink-0 items-center justify-center rounded-lg border-2 border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                )}
              </div>
            ))}
            <ChoiceRow
              title="None of these"
              detail="The AI writes from its own knowledge instead — more likely to get answers wrong."
              onClick={onDecline}
              disabled={busy}
              muted
            />
          </div>
        )}

        {question.status === "SourceUnavailable" && (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Without an article the AI writes from memory, and those questions are far more
                likely to have a wrong answer. If you go ahead, check every one before you
                publish.
              </span>
            </p>
            {/* `py-1 text-sm`: a pair of actions inside a card, not a page's primary call — at the
                default size they dwarfed the text above them, and wrapped to two full-width
                slabs on a phone. */}
            <div className="flex flex-wrap items-center gap-3">
              <LiftedButton
                type="button"
                className="flex items-center gap-2 py-1 text-sm"
                onClick={onRetry}
                isPending={busy}
              >
                {/* LiftedButton draws its own spinner while pending; two would read as a glitch. */}
                {!busy && <RotateCw className="h-4 w-4" aria-hidden />}
                Try again
              </LiftedButton>
              <LiftedButton
                type="button"
                className="flex items-center gap-2 bg-muted py-1 text-sm text-foreground"
                liftColor="muted-foreground"
                onClick={onWriteFromMemory}
                disabled={busy}
              >
                {/* Icon first, like every LiftedButton (CLAUDE.md): ArrowRight is "go on". */}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                Continue anyway
              </LiftedButton>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onEditTopic}
          disabled={busy}
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 disabled:opacity-60"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Change the topic
        </button>
      </CardContent>
    </Card>
  );
};
