import { useEffect, useRef, useState } from "react";

import type { AiGenerationMode } from "../../../api/generate-ai-quiz";

import { RubiksCube } from "./rubiks-cube";

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
  STEPS.reduce((current, step) => (seconds >= step.after ? step : current), STEPS[0]);

export interface GeneratingOverlayProps {
  /** Names the wait in the first line. Source mode is reading, not inventing. */
  mode: AiGenerationMode;
}

/**
 * The screen while the model writes.
 *
 * <b>Why a screen at all.</b> Generation is 10-40 seconds against a 90s provider
 * timeout, and until now the entire signal was a 16px spinner inside the Generate
 * button. That is thin for the app's most expensive action — it is metered, it cannot
 * be cancelled, and leaving the page spends it (`LeaveGenerationDialog`). Covering the
 * form also settles a smaller thing: the fields stay editable mid-flight today, and
 * edits made then are silently not in the request.
 *
 * <b>Not a Radix dialog</b>, though it looks like one. `LeaveGenerationDialog` opens
 * *on top of* this — that is precisely when it opens — and stacking two modal dialogs
 * means two focus scopes and two body locks fighting over the same moment for no gain
 * here. So: a plain fixed layer at z-40 (over the z-30 header, under any dialog at
 * z-50) that takes the pointer events and announces itself politely. It moves focus to
 * itself on mount so a screen reader lands on the status, but it does not trap: the
 * form behind stays reachable by Tab, which is the honest trade for not fighting the
 * dialog that has to be able to open over it.
 */
export const GeneratingOverlay = ({ mode }: GeneratingOverlayProps) => {
  const [seconds, setSeconds] = useState(0);
  const region = useRef<HTMLDivElement>(null);

  // A clock is an outside system, so it is an Effect. One interval for the whole
  // script rather than a timer per line.
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    region.current?.focus();
  }, []);

  const step = stepFor(seconds);

  return (
    <div
      ref={region}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-background/70 px-6 backdrop-blur-sm focus:outline-none"
    >
      <RubiksCube cubieSize={40} />

      <div className="max-w-sm text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {mode === "Source"
            ? "Reading your material"
            : "Writing your questions"}
        </h2>
        {/* Keyed so the line re-enters rather than swapping in place — the change
            is the information, and a silent text replacement reads as a glitch. */}
        <p
          key={step.label}
          className="mt-2 text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-1"
        >
          {step.label}
        </p>
        <p className="mt-4 text-xs text-muted-foreground/80">
          This usually takes 10–30 seconds. Leaving now cancels it.
        </p>
      </div>
    </div>
  );
};
