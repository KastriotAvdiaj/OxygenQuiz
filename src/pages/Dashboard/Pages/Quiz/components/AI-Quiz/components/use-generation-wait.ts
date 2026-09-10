import { useEffect, useRef, useState } from "react";

/**
 * The floor on the cube. A generation that comes back unusually fast still holds
 * here, so the set-piece is never a flash — and with the beats below the overlay
 * is on screen for at least 5.3s whatever happens.
 *
 * It is a floor, not a delay. Real generations run 10-40s
 * (docs/quiz/ai-quiz-generation-flow.md), so on the normal path this expires long
 * before the model answers and costs the user nothing.
 */
const MIN_GENERATING_MS = 3600;

/** How long "your quiz is ready" holds before the overlay gets out of the way. */
const SUCCESS_DWELL_MS = 1400;

/** The fade-out. Must match the `duration-300` on the leaving classes. */
const EXIT_MS = 300;

/**
 * `leaving` and `aborting` both fade out and both end the overlay. They are two
 * names because they are not the same moment: `leaving` follows the success beat
 * and still says the quiz is ready on its way out, while `aborting` is the model
 * having failed — and an overlay that reads "your quiz is ready" for 300ms over a
 * quota refusal is worse than no animation at all.
 */
export type GenerationPhase =
  | "generating"
  | "succeeded"
  | "leaving"
  | "aborting";

/**
 * The overlay's whole life, as one small state machine.
 *
 * generating → succeeded → leaving → gone, with a floor under the first and a dwell
 * on the second; a failure detours through `aborting` instead. Two things are
 * deliberate:
 *
 * <b>A failure skips both.</b> It goes straight to `aborting`, so the error panel is
 * ~300ms away rather than five seconds. The only outcomes that return in milliseconds
 * are the refusals — quota spent, kill switch, unverified email — and an animation
 * held over "you're out of generations" is the one case where a minimum duration
 * actively costs the user something.
 *
 * <b>Nothing can strand it.</b> If the request settles without either flag — a state
 * the container shouldn't be able to produce — the machine still leaves rather than
 * parking a full-screen layer over the app forever.
 *
 * Presentation timing, not generation state, which is why it lives beside the overlay
 * and takes flags the view already has. A story can bypass it and pass a phase.
 */
export const useGenerationWait = (
  isGenerating: boolean,
  { succeeded, failed }: { succeeded: boolean; failed: boolean }
): GenerationPhase | null => {
  const [phase, setPhase] = useState<GenerationPhase | null>(null);
  const startedAt = useRef(0);

  // Each step is a timer, and a timer is an outside system — so, an Effect each.
  useEffect(() => {
    if (!isGenerating) return;
    startedAt.current = Date.now();
    setPhase("generating");
  }, [isGenerating]);

  useEffect(() => {
    if (phase !== "generating" || isGenerating) return;

    if (failed) {
      setPhase("aborting");
      return;
    }

    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, MIN_GENERATING_MS - elapsed);
    const id = window.setTimeout(
      () => setPhase(succeeded ? "succeeded" : "aborting"),
      wait
    );
    return () => window.clearTimeout(id);
  }, [phase, isGenerating, succeeded, failed]);

  useEffect(() => {
    if (phase !== "succeeded") return;
    const id = window.setTimeout(() => setPhase("leaving"), SUCCESS_DWELL_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving" && phase !== "aborting") return;
    const id = window.setTimeout(() => setPhase(null), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  return phase;
};
