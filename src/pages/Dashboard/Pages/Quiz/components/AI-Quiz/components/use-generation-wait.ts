import { useEffect, useRef, useState } from "react";

/**
 * How long `GeneratingOverlay` stays up after a *successful* generation that came
 * back unusually fast. Enough to stop a flash, not enough to be a wait of its own.
 *
 * It deliberately does not apply to failures. A real generation runs 10-40s
 * (docs/quiz/ai-quiz-generation-flow.md), so the only things that return in
 * milliseconds are the refusals — quota spent, kill switch, unverified email, a
 * validation bounce — and holding an animation over "you're out of generations"
 * delays the one screen the user actually needs.
 */
const MIN_VISIBLE_MS = 500;

/**
 * Whether the generating overlay should be on screen.
 *
 * Not simply `isGenerating`: a success landing inside {@link MIN_VISIBLE_MS} would
 * flash the whole set-piece and rip it away again. A failure gets no such grace.
 *
 * Presentation timing, not generation state — which is why it lives beside the
 * overlay and takes flags the view already has, rather than reaching into the
 * mutation. A story can bypass it by rendering the overlay directly.
 */
export const useGenerationWait = (
  isGenerating: boolean,
  { failed }: { failed: boolean }
) => {
  const [visible, setVisible] = useState(isGenerating);
  const startedAt = useRef(0);

  // Synchronising React state with a timeout — the one thing an Effect is for.
  useEffect(() => {
    if (isGenerating) {
      startedAt.current = Date.now();
      setVisible(true);
      return;
    }
    if (!visible) return;
    if (failed) {
      setVisible(false);
      return;
    }
    const remaining = MIN_VISIBLE_MS - (Date.now() - startedAt.current);
    if (remaining <= 0) {
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(id);
  }, [isGenerating, failed, visible]);

  return visible;
};
