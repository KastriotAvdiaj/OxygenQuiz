import type { AiQuotaStatus } from "../../../api/generate-ai-quiz";

/**
 * <b>There is no model note here any more.</b> It used to render "Questions are written by
 * {model}" under the allowance line, on the reasoning that someone comparing two quizzes made a
 * month apart has no other way to know the model changed under them.
 *
 * The reasoning was right; the placement and the copy were not. `quota.model` is the raw
 * provider slug (`openai/gpt-oss-120b`), which is an internal identifier rather than user-facing
 * copy — it answers "which model" only for someone who already knows what that string is, and
 * reads as a leaked config value to everyone else. And it cost a line in the one row of a screen
 * that had just had ~170px removed from it to get the Generate button above the fold
 * (docs/adr/0002-quiz-creation-routes-hide-the-dashboard-header.md).
 *
 * The traceability argument also points somewhere else. "Which model made this quiz?" is a
 * question about a **saved quiz**, asked later — not about the form you are still filling in,
 * where the answer is a prediction. If it is worth answering, it belongs on the quiz record
 * server-side, not on this row. `AiQuotaStatus.model` stays on the API contract for that reason;
 * nothing in the UI reads it today.
 */
/**
 * States the daily allowance up front, before the user spends one.
 *
 * A bare "1 left" tells someone nothing about what they started with, and finding out the
 * limit by hitting it is the version of this that generates support messages. So the total
 * is always named, and the last one is called out — running out mid-thought on a quiz you
 * were about to make is the moment worth warning about, not the moment after.
 */
export const QuotaNote = ({ quota }: { quota: AiQuotaStatus | null }) => {
  if (!quota?.enabled) return null;

  const { remaining, limit } = quota;

  // Staff have no daily cap (docs/quiz/ai-quiz-generation-flow.md §4a). Say so plainly rather
  // than rendering a counter that never moves — and don't imply it's free: these still land
  // in the cost ledger and still count against the budget caps.
  if (limit === null || remaining === null) {
    return (
      <p className="text-muted-foreground text-xs">
        No daily limit on your account{quota.used > 0 && ` — ${quota.used} used today`}.
      </p>
    );
  }

  const noun = `AI quiz${limit === 1 ? "" : "zes"}`;

  if (remaining <= 0) {
    return (
      <p className="text-muted-foreground text-xs">
        You've used today's {limit} {noun}. More tomorrow — or use your own AI below.
      </p>
    );
  }

  return (
    <p
      className={`text-xs ${
        remaining === 1 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
      }`}
    >
      {remaining === limit
        ? `You get ${limit} ${noun} a day.`
        : `${remaining} of ${limit} left today.`}
      {remaining === 1 && limit > 1 && " This is your last one."}
    </p>
  );
};
