import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  AiGenerateError,
  aiJobError,
  getAiJob,
  isAiJobFinished,
  startAiJob,
  type AiGenerateInput,
  type AiGenerateResult,
  type AiGroundingAnswers,
  type AiJob,
  type AiJobStage,
} from "../../api/generate-ai-quiz";

/** How often a job is asked about while its card is on screen. */
export const JOB_POLL_MS = 1500;

/**
 * How many polls in a row may fail before the page stops waiting. The job is unaffected — it
 * runs on the server — so the message says where the result will turn up.
 */
export const JOB_POLL_MAX_FAILURES = 6;

/** What to run: a new generation, or a job that is already going (found when the wizard opened). */
export type AiJobRun =
  | { input: AiGenerateInput & AiGroundingAnswers & { returnPath?: string } }
  | { attach: AiJob };

/** A generation's result, and the job it came from — so the caller can mark it collected. */
export interface AiJobOutcome {
  jobId: string;
  result: AiGenerateResult;
}

/** `AiGenerateError` with the job it came from, for the same reason. */
export class AiJobError extends AiGenerateError {
  constructor(
    public jobId: string | null,
    error: AiGenerateError,
  ) {
    super(error.code, error.message, error.retryAfter, error.grounding);
    this.name = "AiJobError";
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("Stopped watching the job.", "AbortError"));
      },
      { once: true },
    );
  });

/**
 * Starts (or joins) a job and waits for it, reporting each stage on the way. Resolves and
 * rejects with what `generateAiQuiz` did, so a caller that used the old mutation needs to
 * change nothing but the import.
 *
 * Exported for tests: it is the whole behaviour, with no React in it.
 */
export const runAiJob = async (
  run: AiJobRun,
  onStage: (stage: AiJobStage) => void,
  signal: AbortSignal,
): Promise<AiJobOutcome> => {
  let job: AiJob;
  if ("attach" in run) {
    job = run.attach;
  } else {
    try {
      job = await startAiJob(run.input);
    } catch (error) {
      throw new AiJobError(null, error as AiGenerateError);
    }
  }

  let failures = 0;
  for (;;) {
    onStage(job.stage);
    if (isAiJobFinished(job)) break;

    await sleep(JOB_POLL_MS, signal);
    try {
      job = await getAiJob(job.id);
      failures = 0;
    } catch {
      failures += 1;
      if (failures >= JOB_POLL_MAX_FAILURES) {
        throw new AiJobError(
          // No id: the job is still running, so it must not be marked collected.
          null,
          new AiGenerateError(
            "Unknown",
            "We lost the connection, but your quiz is still being written. You'll get a notification when it's ready.",
          ),
        );
      }
    }
  }

  if (job.status === "Succeeded" && job.result) return { jobId: job.id, result: job.result };
  throw new AiJobError(job.id, aiJobError(job));
};

/**
 * The wizard's generation, as a job on the server (docs/quiz/ai-quiz-generation-flow.md §3c).
 *
 * A mutation whose function is the whole wait, so the container keeps the shape it had with
 * `useGenerateAiQuiz`: `mutate(run, { onSuccess, onError })` and `isPending`. `stage` is the one
 * addition — what the progress card shows.
 *
 * **Leaving stops the watching, not the work.** The Effect below aborts the polling when the
 * wizard unmounts; it is an Effect because a running poll loop is exactly the kind of outside
 * system one is for. The server sees the polls stop and sends a notification when the job ends.
 * Per-call `onSuccess`/`onError` don't fire after an unmount (React Query's rule), so a result
 * that arrives too late is simply left on the server to be collected next time.
 */
export const useAiGenerationJob = () => {
  const [stage, setStage] = useState<AiJobStage>("Queued");
  const watching = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      watching.current?.abort();
    },
    [],
  );

  const mutation = useMutation<AiJobOutcome, AiJobError, AiJobRun>({
    mutationFn: (run) => {
      watching.current?.abort();
      const controller = new AbortController();
      watching.current = controller;
      setStage("attach" in run ? run.attach.stage : "Queued");
      return runAiJob(run, setStage, controller.signal);
    },
  });

  return { ...mutation, stage };
};
