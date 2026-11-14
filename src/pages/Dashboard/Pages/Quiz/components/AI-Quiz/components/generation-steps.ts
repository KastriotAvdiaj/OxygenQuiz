import type { AiGenerationMode, AiJobStage } from "../../../api/generate-ai-quiz";

export type StepState = "done" | "active" | "pending";

export interface Step {
  key: string;
  label: string;
  state: StepState;
}

/**
 * The steps, and where each one stands. Pure, so it is tested without rendering.
 *
 * Every step is something the server said has started (`AiJobStage`) or that this page did
 * itself — none is paced from a clock. The list this replaced was: five lines on a timer,
 * worded carefully because the client could not know which was true. It can now.
 *
 * <b>Queued shows the first step as active</b>, not a fourth "Starting…" row: a job normally
 * leaves the queue within a poll, and a row that flashes by reads as a glitch. When jobs do
 * queue (several authors at once), "Finding sources" spinning a little longer is the honest
 * picture — the work hasn't visibly moved yet.
 */
export const generationSteps = (
  mode: AiGenerationMode,
  stage: AiJobStage,
  isDone: boolean,
  questionCount?: number,
): Step[] => {
  const writing = stage === "Writing" || stage === "Done";
  const steps: Step[] = [];

  if (mode === "Topic") {
    steps.push({
      key: "sources",
      label: "Finding sources",
      state: isDone || writing ? "done" : "active",
    });
  }
  steps.push({
    key: "writing",
    label: mode === "Source" ? "Writing questions from your material" : "Writing the questions",
    // In Source mode there is no earlier step, so writing is what a queued job is waiting to do.
    state: isDone ? "done" : writing || mode === "Source" ? "active" : "pending",
  });
  steps.push({
    key: "ready",
    label: !isDone
      ? "Ready for you to review"
      : questionCount === undefined
        ? "Ready for you to review"
        : `${questionCount} question${questionCount === 1 ? "" : "s"} ready for you to review`,
    state: isDone ? "done" : "pending",
  });
  return steps;
};
