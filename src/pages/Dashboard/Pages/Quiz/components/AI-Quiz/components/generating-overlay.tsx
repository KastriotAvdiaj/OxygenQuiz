import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";

import type { AiGenerationMode, AiJobStage } from "../../../api/generate-ai-quiz";

import { generationSteps, type StepState } from "./generation-steps";
import type { GenerationPhase } from "./use-generation-wait";

export interface GeneratingOverlayProps {
  /** Which beat of the wait to show. `useGenerationWait` owns the timing. */
  phase: GenerationPhase;
  /** Source mode has no sources to find — its list is one step shorter. */
  mode: AiGenerationMode;
  /** How far the job has got, as the server reported it. */
  stage?: AiJobStage;
  /** How many survived the parse. Shown on the last step when we have it. */
  questionCount?: number;
  /**
   * Leave with the generation still running. Not offered when absent, and never once the
   * questions have landed — there is nothing left to wait for.
   */
  onKeepBrowsing?: () => void;
}

/** After this long the hint stops promising "under a minute". */
const SLOW_AFTER_SECONDS = 45;

/**
 * The card while a quiz is being written, and the moment it lands.
 *
 * <b>It no longer has to be watched.</b> The generation is a job on the server
 * (docs/quiz/ai-quiz-generation-flow.md §3c), so this card is for the author who chooses to
 * stay: it shows the real steps, and offers a way out — *Keep browsing* — that costs them
 * nothing. Until 2026-11-14 the request lived in this tab, the card said "leaving now cancels
 * it", and a dialog stood in the doorway to make that true.
 *
 * <b>Why it still covers the form.</b> The fields would otherwise stay editable mid-flight,
 * and edits made then are silently not in the request. It is also the one place the wait is
 * explained, so it gets the centre of the screen rather than a line under a button.
 *
 * <b>It ends on a beat rather than a cut.</b> When the questions arrive the last step ticks,
 * the layer fades, and only then does the review step come in with an entrance of its own —
 * the view holds it back until this is leaving; see `resultsMayShow` in
 * ai-quiz-wizard-view.tsx for why the two are sequenced rather than crossfaded.
 *
 * <b>Not a Radix dialog</b>, though it looks like one: a plain fixed layer at z-40 (over the
 * z-30 header, under any dialog at z-50) that announces itself politely. It moves focus to
 * itself on mount so a screen reader lands on the status, and does not trap — the header
 * behind it, and so every other page, stays a Tab away, which is now the point.
 *
 * <b>Its exit animation is safe</b> where `TabsContent`'s was not: this is `fixed`, so an
 * element held on for 300ms of fade costs the page no layout at all
 * (docs/RESPONSIVE.md, "Never give a Radix panel an exit animation").
 */
export const GeneratingOverlay = ({
  phase,
  mode,
  stage = "Queued",
  questionCount,
  onKeepBrowsing,
}: GeneratingOverlayProps) => {
  const [seconds, setSeconds] = useState(0);
  const region = useRef<HTMLDivElement>(null);

  const isLeaving = phase === "leaving" || phase === "aborting";
  // Only a real success ticks the last step. `aborting` fades out as it stands, because what
  // comes next is the error panel, not a quiz.
  const isDone = phase === "succeeded" || phase === "leaving";

  // A clock is an outside system, so it is an Effect. It only decides which hint is shown.
  useEffect(() => {
    if (isDone) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isDone]);

  useEffect(() => {
    region.current?.focus();
  }, []);

  const steps = generationSteps(mode, stage, isDone, questionCount);

  return (
    <div
      ref={region}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      aria-busy={!isDone}
      className={cn(
        "fixed inset-0 z-40 flex items-center justify-center bg-muted/60 px-4 backdrop-blur-sm focus:outline-none",
        isLeaving
          ? "animate-out fade-out-0 duration-300 fill-mode-forwards"
          : "animate-in fade-in-0 duration-300",
      )}
    >
      {/* The dialog surface (bg-background), so the wait reads as a step of the page rather
          than a caption over it. The layer is the fade; the card only rises into place. */}
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border border-border bg-background px-6 py-7 shadow-xl dark:border-foreground/30 sm:px-8",
          !isLeaving && "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out",
        )}
      >
        <h2 className="text-lg font-semibold">
          {isDone ? "Your quiz is ready" : "Writing your quiz"}
        </h2>

        <ol className="mt-5 space-y-3.5">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-3">
              <StepMark state={step.state} />
              <span
                className={cn(
                  "text-sm transition-colors duration-300",
                  step.state === "pending" && "text-muted-foreground",
                  step.state === "active" && "font-medium text-foreground",
                  step.state === "done" && "text-foreground",
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        {/* Held at one height through the hand-over, so the card doesn't jump when the
            button and the hint give way to nothing on the success beat. */}
        <div
          className={cn(
            "mt-6 border-t border-border pt-5 transition-opacity duration-300",
            isDone && "pointer-events-none opacity-0",
          )}
          aria-hidden={isDone}
        >
          <p className="text-xs text-muted-foreground">
            {seconds < SLOW_AFTER_SECONDS
              ? "This usually takes under a minute."
              : "Still working — a longer quiz takes a little more."}
            {onKeepBrowsing && " You don't have to wait here."}
          </p>

          {onKeepBrowsing && (
            <>
              <LiftedButton
                type="button"
                onClick={onKeepBrowsing}
                disabled={isDone}
                tabIndex={isDone ? -1 : undefined}
                outerClassName="mt-4 w-full"
                className="flex items-center justify-center gap-2 bg-muted text-foreground"
                liftColor="muted-foreground"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                Keep browsing
              </LiftedButton>
              <p className="mt-2.5 text-center text-xs text-muted-foreground">
                We'll send you a notification when it's ready.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** Done is a tick, the current step turns, what's ahead is an empty ring. */
const StepMark = ({ state }: { state: StepState }) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
      state === "done" && "border-primary bg-primary text-primary-foreground",
      state === "active" && "border-primary/40 text-primary",
      state === "pending" && "border-border",
    )}
  >
    {state === "done" && <Check className="h-3.5 w-3.5 animate-in zoom-in-50 duration-200" />}
    {state === "active" && <Spinner size="sm" />}
  </span>
);
