import type { ParseResult } from "../parse-ai-output";

export interface ImportNoticesProps {
  result: ParseResult;
}

/**
 * What the parser threw away, and what it silently substituted.
 *
 * <b>This is a report about the user's data, not a tip about AI.</b> That distinction is the
 * whole reason it is its own component. Silently importing 8 of 10 questions is the failure
 * mode the import banner was built to prevent (docs/quiz/ai-quiz-architecture.md §6), and two
 * rows of that catalogue — "that question dropped w/ reason" and "falls back to quiz difficulty;
 * flagged in summary" — name this UI as the mechanism that makes it non-silent. It used to live
 * inside the old `ImportSummary` banner alongside a routine "Drafted 7 questions" line, which meant the
 * obvious next request — let people stop seeing that line — would have taken this with it.
 *
 * So: **no dismiss, no "don't show again", no persistence.** A user cannot opt out of being told
 * that four of their ten questions did not survive validation. See
 * docs/adr/0005-the-import-report-is-not-a-notice-you-can-turn-off.md.
 *
 * Renders nothing when nothing went wrong, which is the common case — so the cost of it being
 * undismissable is zero on the quizzes where there is nothing to say.
 *
 * <b>Behind a chip since 2026-11-15</b> (`ReviewChips`, red, first in the row, labelled with the
 * count — `describeImport`). It was a red box above the review; the author asked for it to sit
 * with the other notices. Still nothing to dismiss: the chip is there for as long as the questions
 * are, and the reasons are one press away. What that gives up is the reasons being read without a
 * press — the count on the chip says something went wrong, this says what.
 */
export const ImportNotices = ({ result }: ImportNoticesProps) => {
  const hasNotices =
    result.dropped.length > 0 || result.difficultyFallbacks.length > 0;

  if (!hasNotices) return null;

  return (
    <>
      <p className="text-sm font-medium">Some of what came back could not be used.</p>

      {/* Listed individually with reasons, never as a count. A count tells the user something
          went wrong without telling them what, which is the worst of both — they cannot judge
          whether to regenerate, edit, or accept the shortfall. */}
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
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
    </>
  );
};
