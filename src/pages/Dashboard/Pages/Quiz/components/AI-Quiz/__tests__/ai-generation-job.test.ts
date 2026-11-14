import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiGenerateError, type AiJob, type AiJobStage } from "../../../api/generate-ai-quiz";
import { generationSteps } from "../components/generation-steps";
import { AiJobError, JOB_POLL_MAX_FAILURES, JOB_POLL_MS, runAiJob } from "../use-ai-generation-job";

/**
 * A generation as a job on the server (docs/quiz/ai-quiz-generation-flow.md §3c): started,
 * polled while its card is on screen, and handed over in the shapes the old held-open request
 * resolved and rejected with. The network is mocked at the API module; the timers are fake, so
 * "a poll every 1.5 s" costs nothing to test.
 */
const api = vi.hoisted(() => ({ startAiJob: vi.fn(), getAiJob: vi.fn() }));
vi.mock("../../../api/generate-ai-quiz", async (original) => ({
  ...(await original<typeof import("../../../api/generate-ai-quiz")>()),
  startAiJob: api.startAiJob,
  getAiJob: api.getAiJob,
}));

const job = (over: Partial<AiJob> = {}): AiJob => ({
  id: "job-1",
  status: "Running",
  stage: "Writing",
  createdAt: "2026-11-14T12:00:00Z",
  ...over,
});

const input = {
  mode: "Topic" as const,
  topic: "General Knowledge",
  languageNames: ["English"],
  categoryNames: [],
  difficultyNames: ["Easy"],
  questionCount: 10,
  allowedTypes: ["MultipleChoice"],
};

const result = { payload: '{"questions":[]}', quotaRemaining: 1, inputTokens: 700, outputTokens: 300 };

/** Runs a job to its end with fake time, returning what happened and every stage reported. */
const run = async (start: Parameters<typeof runAiJob>[0], signal = new AbortController().signal) => {
  const stages: AiJobStage[] = [];
  const outcome = runAiJob(start, (stage) => stages.push(stage), signal).then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.runAllTimersAsync();
  return { ...(await outcome), stages };
};

describe("runAiJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    api.startAiJob.mockReset();
    api.getAiJob.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("starts a job, follows its stages, and resolves with the result and the job it came from", async () => {
    api.startAiJob.mockResolvedValue(job({ status: "Queued", stage: "Queued" }));
    api.getAiJob
      .mockResolvedValueOnce(job({ stage: "FindingSources" }))
      .mockResolvedValueOnce(job({ stage: "Writing" }))
      .mockResolvedValueOnce(job({ status: "Succeeded", stage: "Done", result }));

    const done = await run({ input: { ...input, returnPath: "/dashboard/quizzes/ai" } });

    expect(done).toMatchObject({ ok: true, value: { jobId: "job-1", result } });
    expect(done.stages).toEqual(["Queued", "FindingSources", "Writing", "Done"]);
    expect(api.startAiJob).toHaveBeenCalledWith(expect.objectContaining({ returnPath: "/dashboard/quizzes/ai" }));
  });

  it("waits between polls rather than asking in a loop", async () => {
    api.startAiJob.mockResolvedValue(job());
    api.getAiJob.mockResolvedValue(job());
    const controller = new AbortController();
    const pending = runAiJob({ input }, () => {}, controller.signal).catch(() => undefined);

    await vi.advanceTimersByTimeAsync(JOB_POLL_MS * 3 + 10);
    expect(api.getAiJob).toHaveBeenCalledTimes(3);

    controller.abort();
    await pending;
  });

  it("joins a job that is already running without starting another", async () => {
    api.getAiJob.mockResolvedValueOnce(job({ status: "Succeeded", stage: "Done", result }));

    const done = await run({ attach: job({ stage: "Writing" }) });

    expect(api.startAiJob).not.toHaveBeenCalled();
    expect(done).toMatchObject({ ok: true, value: { jobId: "job-1" } });
    expect(done.stages).toEqual(["Writing", "Done"]);
  });

  it("hands over a job that had already finished without polling at all", async () => {
    const done = await run({ attach: job({ status: "Succeeded", stage: "Done", result }) });

    expect(api.getAiJob).not.toHaveBeenCalled();
    expect(done.ok).toBe(true);
  });

  it("rejects a failed job with the error the wizard already shows, and the job it came from", async () => {
    api.startAiJob.mockResolvedValue(job({ status: "Queued", stage: "Queued" }));
    api.getAiJob.mockResolvedValueOnce(
      job({
        status: "Failed",
        stage: "Done",
        error: { code: "QuotaExceeded", message: "You've used today's 2 AI quizzes.", retryAfter: "2026-11-15T00:00:00Z" },
      }),
    );

    const done = await run({ input });

    expect(done.ok).toBe(false);
    const error = (done as { error: AiJobError }).error;
    expect(error).toBeInstanceOf(AiGenerateError);
    expect(error).toMatchObject({
      jobId: "job-1",
      code: "QuotaExceeded",
      message: "You've used today's 2 AI quizzes.",
      retryAfter: "2026-11-15T00:00:00Z",
    });
  });

  it("carries grounding's question on a job that needs a choice", async () => {
    const grounding = { status: "NeedsLanguage" as const, languages: ["English", "Albanian"] };
    api.startAiJob.mockResolvedValue(
      job({ status: "NeedsChoice", stage: "Done", error: { code: "SourceNeedsChoice", message: "Which language?", grounding } }),
    );

    const done = await run({ input });

    expect((done as { error: AiJobError }).error).toMatchObject({ code: "SourceNeedsChoice", grounding });
  });

  it("rejects with no job id when the job never started", async () => {
    api.startAiJob.mockRejectedValue(new AiGenerateError("InvalidRequest", "Pick at least one question type."));

    const done = await run({ input });

    // Nothing to mark collected: there is no job.
    expect((done as { error: AiJobError }).error).toMatchObject({ jobId: null, code: "InvalidRequest" });
    expect(api.getAiJob).not.toHaveBeenCalled();
  });

  it("rides out a few failed polls", async () => {
    api.startAiJob.mockResolvedValue(job());
    api.getAiJob
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(job({ status: "Succeeded", stage: "Done", result }));

    expect((await run({ input })).ok).toBe(true);
  });

  it("stops waiting after too many failed polls, and says the quiz is still being written", async () => {
    api.startAiJob.mockResolvedValue(job());
    api.getAiJob.mockRejectedValue(new Error("offline"));

    const done = await run({ input });

    expect(api.getAiJob).toHaveBeenCalledTimes(JOB_POLL_MAX_FAILURES);
    const error = (done as { error: AiJobError }).error;
    // No job id: it is still running, so it must not be marked collected.
    expect(error.jobId).toBeNull();
    expect(error.message).toContain("still being written");
  });

  it("stops polling when the page stops watching", async () => {
    api.startAiJob.mockResolvedValue(job());
    api.getAiJob.mockResolvedValue(job());
    const controller = new AbortController();
    const outcome = runAiJob({ input }, () => {}, controller.signal).catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(JOB_POLL_MS + 10);
    controller.abort();
    const error = await outcome;
    await vi.advanceTimersByTimeAsync(JOB_POLL_MS * 5);

    // Not an outcome of the generation — the wizard ignores it.
    expect(error).not.toBeInstanceOf(AiGenerateError);
    expect(api.getAiJob).toHaveBeenCalledTimes(1);
  });
});

describe("generationSteps", () => {
  const states = (...args: Parameters<typeof generationSteps>) =>
    generationSteps(...args).map((step) => `${step.key}:${step.state}`);

  it("shows the first step turning while a job is queued or finding sources", () => {
    expect(states("Topic", "Queued", false)).toEqual(["sources:active", "writing:pending", "ready:pending"]);
    expect(states("Topic", "FindingSources", false)).toEqual(["sources:active", "writing:pending", "ready:pending"]);
  });

  it("ticks sources once the writing has started", () => {
    expect(states("Topic", "Writing", false)).toEqual(["sources:done", "writing:active", "ready:pending"]);
  });

  it("has no sources step for the author's own material", () => {
    expect(states("Source", "Queued", false)).toEqual(["writing:active", "ready:pending"]);
    expect(states("Source", "Writing", false)).toEqual(["writing:active", "ready:pending"]);
  });

  it("ticks everything when the questions have landed, and names how many", () => {
    expect(states("Topic", "Done", true, 12)).toEqual(["sources:done", "writing:done", "ready:done"]);
    expect(generationSteps("Topic", "Done", true, 12).at(-1)?.label).toBe("12 questions ready for you to review");
    expect(generationSteps("Topic", "Done", true, 1).at(-1)?.label).toBe("1 question ready for you to review");
    expect(generationSteps("Topic", "Done", true).at(-1)?.label).toBe("Ready for you to review");
  });

  it("does not tick the last step for a job that ended without questions", () => {
    // The server says Done for a failure too; only the page knows whether questions arrived.
    expect(states("Topic", "Done", false)).toEqual(["sources:done", "writing:active", "ready:pending"]);
  });
});
