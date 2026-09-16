import { RotateCcw } from "lucide-react";

export interface ImportNoteProps {
  /** Topic-mode quizzes get a fact-check nudge; source-based ones don't need one. */
  isFromTopic?: boolean;
  onStartOver?: () => void;
}

/**
 * One quiet line above the prefilled builder: where these questions came from, and the way
 * back out.
 *
 * <b>It used to be a banner</b> — a bordered, tinted box carrying a "Drafted 7 questions" status
 * line, the provenance nudge, "Start over", "Dismiss" and "Don't show again", the last of those
 * writing a versioned key to `localStorage` and leaving behind a collapsed row with an "AI note"
 * button to bring it back. Six controls and a storage preference to deliver one sentence of
 * advice, on a screen whose actual job is a quiz builder.
 *
 * Three things fell out when it shrank, and each was doing less than it looked:
 *
 * - **The count.** The right-hand panel is headed "Quiz Questions (7)". The banner was saying the
 *   same number a second time, louder.
 * - **Both dismissals, and the storage behind them.** They existed because the notice was loud
 *   enough to be worth silencing. A line of 12px muted text is not, and a preference nobody needs
 *   to set is a preference that cannot go stale, cannot arrive pre-dismissed for the wrong copy,
 *   and cannot be read from a browser that throws on `localStorage`.
 * - **The "AI note" reopen affordance**, which existed only to undo the dismissal.
 *
 * <b>What did not fall out, deliberately.</b> The provenance sentence stays: topic mode had no
 * source to check against, so the model was recalling facts and the characteristic failure is a
 * confident wrong answer. No prompt fixes that; a human reading it does
 * (docs/quiz/ai-quiz-generation-plan.md §8). And `Start over` stays, because it has no other home
 * on this screen — dropping the notice must not quietly drop an *action* with it.
 *
 * <b>Still not a modal</b>, for the reason in
 * docs/adr/0005-the-import-report-is-not-a-notice-you-can-turn-off.md: a dialog fires before the
 * questions are on screen, and by the time someone is reading answer three the warning is gone.
 * Sitting above the questions while they are read is the entire mechanism — and it survives the
 * shrink, because a muted line is still in the reading path.
 *
 * <b>What is deliberately NOT here.</b> Dropped questions and difficulty fallbacks live in
 * `ImportNotices`, which renders only when something actually happened to the user's data and
 * carries no dismissal at all. That split is the subject of ADR 0005 and is unaffected by this:
 * removing a dismissal from the advice cannot make a data-loss report opt-out-able.
 */
export const ImportNote = ({ isFromTopic = false, onStartOver }: ImportNoteProps) => {
  if (!isFromTopic && !onStartOver) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
      {/* Always rendered, even when empty, so `Start over` keeps its place on the right of
          the row rather than jumping to the left on source-based imports. */}
      <p className="min-w-0 text-xs text-muted-foreground">
        {isFromTopic &&
          "These came from the AI's own knowledge rather than a source you gave it — check the answers before you publish."}
      </p>

      {onStartOver && (
        <button
          type="button"
          onClick={onStartOver}
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Start over
        </button>
      )}
    </div>
  );
};
