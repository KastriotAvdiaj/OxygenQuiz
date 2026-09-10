import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/utils/cn";

import type { AiGenerationMode } from "../../../api/generate-ai-quiz";

import { RubiksCube } from "./rubiks-cube";
import type { GenerationPhase } from "./use-generation-wait";

/**
 * Elapsed-time script for the wait. Seconds since the request went out.
 *
 * There is no streaming (docs/quiz/ai-quiz-generation-flow.md, known issue 12), so the
 * client cannot know which of these is actually happening — they are paced from the
 * clock, and worded so none of them claims a fact we don't have. What they buy is the
 * thing a spinning shape cannot: evidence that time is passing and that the app knows
 * the wait is long. The last line stops making promises entirely, because past ~30s the
 * honest message is that this one is slow.
 *
 * `fail-slow` in the dev fixtures holds a generation for 20s — use it to watch this.
 */
const STEPS: { after: number; label: string }[] = [
  { after: 0, label: "Sending your brief to the model…" },
  { after: 5, label: "Drafting the questions…" },
  { after: 12, label: "Writing the answer options…" },
  { after: 20, label: "Checking the answers line up…" },
  { after: 30, label: "Still going — a long one. Keep this tab open." },
];

const stepFor = (seconds: number) =>
  STEPS.reduce(
    (current, step) => (seconds >= step.after ? step : current),
    STEPS[0]
  );

export interface GeneratingOverlayProps {
  /** Which beat of the wait to show. `useGenerationWait` owns the timing. */
  phase: GenerationPhase;
  /** Names the wait in the first line. Source mode is reading, not inventing. */
  mode: AiGenerationMode;
  /** How many survived the parse. Shown on the success beat when we have it. */
  questionCount?: number;
}

/**
 * The screen while the model writes, and the moment it lands.
 *
 * <b>Why a screen at all.</b> Generation is 10-40 seconds against a 90s provider
 * timeout, and until now the entire signal was a 16px spinner inside the Generate
 * button. That is thin for the app's most expensive action — it is metered, it cannot
 * be cancelled, and leaving the page spends it (`LeaveGenerationDialog`). Covering the
 * form also settles a smaller thing: the fields stay editable mid-flight today, and
 * edits made then are silently not in the request.
 *
 * <b>It ends on a beat rather than a cut.</b> The questions arriving used to swap the
 * screen out from under the user with no acknowledgement that the expensive thing had
 * worked. Now the cube pops, the copy says what came back, and the layer fades to
 * reveal the review step already sitting behind it.
 *
 * <b>Not a Radix dialog</b>, though it looks like one. `LeaveGenerationDialog` opens
 * *on top of* this — that is precisely when it opens — and stacking two modal dialogs
 * means two focus scopes and two body locks fighting over the same moment for no gain
 * here. So: a plain fixed layer at z-40 (over the z-30 header, under any dialog at
 * z-50) that takes the pointer events and announces itself politely. It moves focus to
 * itself on mount so a screen reader lands on the status, but it does not trap: the
 * form behind stays reachable by Tab, which is the honest trade for not fighting the
 * dialog that has to be able to open over it.
 *
 * <b>Its exit animation is safe</b> where `TabsContent`'s was not: this is `fixed`, so
 * an element held on for 300ms of fade costs the page no layout at all
 * (docs/RESPONSIVE.md, "Never give a Radix panel an exit animation").
 */
export const GeneratingOverlay = ({
  phase,
  mode,
  questionCount,
}: GeneratingOverlayProps) => {
  const [seconds, setSeconds] = useState(0);
  const region = useRef<HTMLDivElement>(null);

  const isLeaving = phase === "leaving" || phase === "aborting";
  // Only a real success turns the copy over. `aborting` fades out still showing the
  // working state, because what comes next is the error panel, not a quiz.
  const isDone = phase === "succeeded" || phase === "leaving";

  // A clock is an outside system, so it is an Effect. One interval for the whole
  // script rather than a timer per line, and it stops once the model has answered.
  useEffect(() => {
    if (isDone) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isDone]);

  useEffect(() => {
    region.current?.focus();
  }, []);

  return (
    <div
      ref={region}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      aria-busy={!isDone}
      className={cn(
        "fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-background/70 px-6 backdrop-blur-sm focus:outline-none",
        isLeaving
          ? "animate-out fade-out-0 duration-300 fill-mode-forwards"
          : "animate-in fade-in-0 duration-300"
      )}
    >
      {/* The cube's own transforms live on `.rubiks`, so the entrance gets its own
          element — two animations on one element would fight over `transform`. */}
      <div
        className={cn(
          !isLeaving && "animate-in zoom-in-50 fade-in-0 duration-700 ease-out",
          isLeaving && "animate-out zoom-out-95 duration-300 fill-mode-forwards"
        )}
      >
        <RubiksCube cubieSize={40} solved={isDone} />
      </div>

      <div
        className={cn(
          "max-w-sm text-center",
          !isLeaving &&
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-500",
          isLeaving && "animate-out fade-out-0 duration-200 fill-mode-forwards"
        )}
      >
        {isDone ? <Landed questionCount={questionCount} /> : <Working mode={mode} seconds={seconds} />}
      </div>
    </div>
  );
};

const Working = ({
  mode,
  seconds,
}: {
  mode: AiGenerationMode;
  seconds: number;
}) => {
  const step = stepFor(seconds);
  return (
    <>
      <h2 className="text-lg font-semibold text-foreground">
        {mode === "Source" ? "Reading your material" : "Writing your questions"}
      </h2>
      {/* Keyed so the line re-enters rather than swapping in place — the change
          is the information, and a silent text replacement reads as a glitch. */}
      <p
        key={step.label}
        className="mt-2 animate-in fade-in-0 slide-in-from-bottom-1 text-sm text-muted-foreground"
      >
        {step.label}
      </p>
      <p className="mt-4 text-xs text-muted-foreground/80">
        This usually takes 10–30 seconds. Leaving now cancels it.
      </p>
    </>
  );
};

const Landed = ({ questionCount }: { questionCount?: number }) => (
  <>
    <span className="mx-auto mb-3 flex h-9 w-9 animate-in zoom-in-50 items-center justify-center rounded-full bg-primary/15 text-primary duration-300">
      <Check className="h-5 w-5" />
    </span>
    {/* "Questions", not "quiz created". Nothing has been created — the reply is
        parsed in the browser and the review step is where the user accepts it. A
        success message that claims a saved quiz would be the one lie on a screen
        whose whole job is to say what just happened. */}
    <h2 className="text-lg font-semibold text-foreground">
      Your questions are ready
    </h2>
    <p className="mt-2 text-sm text-muted-foreground">
      {questionCount === undefined
        ? "They're in — bringing them up."
        : `${questionCount} question${questionCount === 1 ? "" : "s"} drafted.`}
    </p>
    <p className="mt-4 text-xs text-muted-foreground/80">
      Nothing is saved yet — you review everything first.
    </p>
  </>
);
