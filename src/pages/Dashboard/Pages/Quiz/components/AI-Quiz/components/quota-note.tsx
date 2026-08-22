import type { AiQuotaStatus } from "../../../api/generate-ai-quiz";

/**
 * Names the model doing the work, under the allowance line.
 *
 * Deliberately quiet and deliberately present: someone comparing two quizzes made a month apart
 * has no other way to know the model changed under them, and "the AI got worse" is unanswerable
 * without it. The server sends null when generation is unavailable, so this renders nothing
 * rather than naming a model that isn't about to run.
 */
const ModelNote = ({ model }: { model: string | null }) =>
  model ? (
    <p className="text-muted-foreground/80 text-[11px]">Questions are written by {model}.</p>
  ) : null;

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
      <>
        <p className="text-muted-foreground text-xs">
          No daily limit on your account{quota.used > 0 && ` — ${quota.used} used today`}.
        </p>
        <ModelNote model={quota.model} />
      </>
    );
  }

  const noun = `AI quiz${limit === 1 ? "" : "zes"}`;

  if (remaining <= 0) {
    return (
      <>
        <p className="text-muted-foreground text-xs">
          You've used today's {limit} {noun}. More tomorrow — or use your own AI below.
        </p>
        <ModelNote model={quota.model} />
      </>
    );
  }

  return (
    <>
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
      <ModelNote model={quota.model} />
    </>
  );
};
