import { useEffect, useRef, useState } from "react";

import { LoadingWave } from "@/components/ui";
import { cn } from "@/utils/cn";

import type { AiGenerationMode } from "../../../api/generate-ai-quiz";

import { Typewriter } from "./typewriter";
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
 * worked. Now the copy turns over to say what came back, the layer fades — and only then
 * does the review step arrive, with an entrance of its own. The view holds it back until
 * this overlay is leaving; see `resultsMayShow` in ai-quiz-wizard-view.tsx for why the
 * two have to be sequenced rather than crossfaded.
 *
 * The typewriter keeps typing through that beat. It is the copy's job to say the work
 * finished, and two things announcing the same moment is one thing too many.
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
      {/* The piece runs its own transforms, so the entrance gets its own element —
          two animations on one element would fight over `transform`. */}
      <div
        className={cn(
          !isLeaving && "animate-in zoom-in-50 fade-in-0 duration-700 ease-out",
          isLeaving && "animate-out zoom-out-95 duration-300 fill-mode-forwards"
        )}
      >
        <Typewriter scale={1.6} />
      </div>

      {/* Both states live in the same grid cell, which is what makes the landing a
          cross-fade rather than a cut: the working copy has to still be there to fade
          *out* of. Stacking them also fixes the height — the block keeps the taller
          state's height throughout, so nothing under it jumps at the moment of the
          handover. Each is hidden from assistive tech while it is the one fading. */}
      <div
        className={cn(
          "grid max-w-sm place-items-center text-center",
          !isLeaving &&
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-500",
          isLeaving && "animate-out fade-out-0 duration-200 fill-mode-forwards"
        )}
      >
        <div
          aria-hidden={isDone}
          className={cn(
            "col-start-1 row-start-1 transition-all duration-300 ease-in",
            isDone && "pointer-events-none -translate-x-8 opacity-0"
          )}
        >
          <Working mode={mode} seconds={seconds} />
        </div>

        {/* One line, and the only green on the screen. No tick beside it: a word that
            says the thing does not need a symbol that says it again, and the colour is
            already carrying the "good news" half. It says *ready for review* rather than
            "created" or "saved", because nothing has been — the reply is parsed in the
            browser and the review step is where the user accepts it. A success message
            that claimed a saved quiz would be the one lie on a screen whose whole job is
            to report what just happened.

            The two slide sideways rather than fading in place: the working copy leaves to
            the left and this arrives from the right, which is a carriage return — the one
            gesture the machine above it makes, and the reason the pair reads as one
            movement instead of two dissolves. Delayed by the length of the exit, so it
            arrives into the space the other has left rather than crossing it on the way. */}
        <p
          aria-hidden={!isDone}
          className={cn(
            "col-start-1 row-start-1 font-quiz text-lg font-semibold tracking-wide text-quiz-success transition-all duration-500 ease-out sm:text-xl",
            isDone
              ? "translate-x-0 opacity-100 delay-200"
              : "translate-x-10 opacity-0"
          )}
        >
          {questionCount === undefined
            ? "Your quiz is ready for review"
            : `${questionCount} question${questionCount === 1 ? "" : "s"} ready for review`}
        </p>
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
  const heading =
    mode === "Source" ? "Reading your material" : "Writing your questions";

  return (
    <>
      {/* The app's own wait signature, borrowed for its one set-piece: the same
          letter-by-letter wave every `LoadingWave` in the product runs. A static heading
          over a moving typewriter had the animation doing all the work of saying "still
          going"; now the sentence is alive too, which is what the rest of the app does.

          Stepped down a size from the default `md`, because this is a 22-character
          sentence rather than the word "LOADING" and 0.2em of tracking adds up fast — at
          `text-xl` it runs out of a 360px screen (docs/RESPONSIVE.md).

          The heading is repeated for screen readers: `LoadingWave` splits the text into
          per-character spans and hides them, announcing only "Loading". */}
      <LoadingWave
        text={heading}
        className="text-base tracking-[0.12em] sm:text-lg"
      />
      <h2 className="sr-only">{heading}</h2>
      {/* Keyed so the line re-enters rather than swapping in place — the change
          is the information, and a silent text replacement reads as a glitch. It enters
          from the right like everything else on this layer: one direction of travel for
          the whole set-piece, matching the carriage above. */}
      <p
        key={step.label}
        className="mt-2 animate-in fade-in-0 slide-in-from-right-3 text-sm text-muted-foreground"
      >
        {step.label}
      </p>
      <p className="mt-4 text-xs text-muted-foreground/80">
        This usually takes 10–30 seconds. Leaving now cancels it.
      </p>
    </>
  );
};

