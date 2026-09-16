import type { CSSProperties } from "react";

import { cn } from "@/utils/cn";

export interface TypewriterProps {
  /**
   * Size multiplier. 1 is the piece's own 120x92, which is about the size of a
   * card thumbnail; the overlay runs it larger. Deliberately not a Tailwind size —
   * every measurement inside is derived from it in CSS (see `.typewriter-frame` in
   * global.css), so a caller passes this one number and nothing else.
   */
  scale?: number;
  /**
   * Freeze it. Users who ask for reduced motion get this from CSS without any
   * caller doing anything; the prop is for stories and snapshots, where a machine
   * that never stops typing is a flaky diff rather than a nice touch.
   */
  still?: boolean;
  className?: string;
}

/**
 * A typewriter at work, in CSS.
 *
 * <b>Why it exists.</b> AI generation is the one wait in the app long enough to need
 * more than a spinner — 10-40 seconds, no streaming, so the client waits blind
 * (docs/quiz/ai-quiz-generation-flow.md, known issue 12). `GeneratingOverlay` is what
 * fills that wait; this is the thing to look at while it lasts.
 *
 * <b>Why a typewriter.</b> It is the only ornament here that is *about* the wait. The
 * model is writing questions, and a carriage stepping left while a page feeds up says
 * that without a word. The cube that stood here before was a nicer toy and said nothing:
 * it could have been on any screen in any product, which is exactly what made it feel
 * imported.
 *
 * <b>It does not have a finished pose, on purpose.</b> It had one for a day: the machine
 * stopped where it stood and the frame settled. What that actually produced was a second
 * thing to read at the exact moment there was already something to read — and a stopped
 * machine is ambiguous anyway, since stopping is also what breaking looks like. The
 * overlay's copy turns over instead, which is unambiguous, and the typing simply carries
 * on underneath it for the second and a half before the layer leaves.
 *
 * <b>Why it isn't `LoadingWave`.</b> Every ordinary wait in the app is LoadingWave, and
 * that is on purpose — a wait should not announce itself as a different thing each time
 * (quiz-loading-view.tsx). This is the exception the split-flap board already
 * established: a moment that wants a set-piece. Keep the exception to one.
 *
 * <b>Why CSS and not a Lottie or a GIF.</b> Four keyframe sets and eleven elements,
 * against a JSON payload plus a player, or a raster that has to be shipped twice for
 * dark mode and cannot take the theme's colours at all. This one is `--primary` at
 * runtime, so it follows the theme — including a tenant's, if the palette ever moves.
 *
 * Adapted from Uiverse.io by Nawsome (MIT); the CSS block in global.css lists what was
 * changed. Purely decorative: `aria-hidden`. The overlay owns the announcement.
 */
export const Typewriter = ({
  scale = 1,
  still = false,
  className,
}: TypewriterProps) => (
  <div
    aria-hidden
    className={cn(
      "typewriter-frame",
      still && "typewriter-still",
      className
    )}
    style={{ "--typewriter-scale": scale } as CSSProperties}
  >
    {/* Eleven boxes, of which only four are elements — the knobs, the levers, the
        ruled lines and all twelve keys are pseudo-elements and box-shadows. The
        empty `<i>` is one of the platen levers and has nowhere else to live. */}
    <div className="typewriter">
      <div className="slide">
        <i />
      </div>
      <div className="paper" />
      <div className="keyboard" />
    </div>
  </div>
);
