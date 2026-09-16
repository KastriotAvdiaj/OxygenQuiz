import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";

import type { ParseResult } from "../parse-ai-output";

/**
 * Versioned on purpose. A dismissal means "I have read *this* wording", so bumping the version
 * is how a materially reworded warning gets one more showing instead of arriving pre-dismissed
 * for everyone who ever clicked the button. Bump it when the copy's *meaning* changes; leave it
 * alone for a typo.
 */
const NOTICE_STORAGE_KEY = "oxygenquiz:ai-import-notice:v1";

/**
 * Reading and writing both swallow failures deliberately. Storage throws rather than returning
 * null in a few real situations — Safari private mode historically, and any browser set to block
 * site data — and the honest fallback for "I could not find out whether you dismissed this" is
 * to show the notice. An unreadable preference must never be the reason a page crashes, and it
 * must never silently resolve to "hidden".
 */
const hasDismissedForever = (): boolean => {
  try {
    return localStorage.getItem(NOTICE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const rememberDismissal = (): void => {
  try {
    localStorage.setItem(NOTICE_STORAGE_KEY, "1");
  } catch {
    // Nothing to do and nothing worth telling the user: the notice simply returns next time.
  }
};

export interface ImportSummaryProps {
  result: ParseResult;
  /** Topic-mode quizzes get a fact-check nudge; source-based ones don't need one. */
  isFromTopic?: boolean;
  onStartOver?: () => void;
}

/**
 * The routine half of the post-import banner: how many questions arrived, and — in topic mode —
 * the reminder that nobody checked them against a source.
 *
 * <b>What is deliberately NOT here.</b> Dropped questions and difficulty fallbacks moved to
 * `ImportNotices`, which cannot be dismissed. The split exists because this component can be
 * turned off permanently and that one must not be: this says "here is the normal outcome", that
 * one says "here is what happened to your data". Merging them again would make the second
 * suppressible by anyone who got tired of the first.
 *
 * <b>Why this is not a modal.</b> It was proposed as one, with the same "don't show again". A
 * dialog fires before the questions are on screen, and by the time someone is reading answer
 * three the warning is gone — NN/g's finding that instructional overlays fade from short-term
 * memory in about twenty seconds is the same evidence `docs/adr/0001` used to reject coach marks
 * on this screen family. Sitting above the questions while they are read is the entire mechanism.
 * See docs/adr/0005-the-import-report-is-not-a-notice-you-can-turn-off.md.
 */
export const ImportSummary = ({
  result,
  isFromTopic = false,
  onStartOver,
}: ImportSummaryProps) => {
  /**
   * Read once, on mount. Not reactive to storage changes from another tab, and it does not need
   * to be — the question "should I show this" is answered when the import lands.
   */
  const [hidden, setHidden] = useState(hasDismissedForever);

  const dismissForever = () => {
    rememberDismissal();
    setHidden(true);
  };

  /**
   * Hiding the banner must not take `Start over` with it.
   *
   * That control has no other home on this screen, so a permanent dismissal would quietly remove
   * the only way to discard a draft and go back — a preference about a *notice* silently removing
   * an *action*. The slim row keeps the action, and the Sparkles button reopens the notice for
   * this import, so "don't show again" stays a decision the user can walk back without going near
   * browser settings.
   */
  if (hidden) {
    if (!onStartOver) return null;

    return (
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-end gap-3 px-1">
        <button
          type="button"
          onClick={() => setHidden(false)}
          title="Show the AI import note again"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="h-3 w-3" /> AI note
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Start over
        </button>
      </div>
    );
  }

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
          {/* Two dismissals, because they answer different questions: "not now" and "not ever".
              Collapsing them into one forces the user to choose permanence to get quiet today. */}
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={dismissForever}
            title="Stored in this browser only"
            className="text-muted-foreground hover:text-foreground text-xs whitespace-nowrap"
          >
            Don't show again
          </button>
        </div>
      </div>
    </div>
  );
};
