import { useState, useEffect, useRef } from "react";
import { audio } from "@/lib/audio";
import {
  CountdownRing,
  type CountdownRingSize,
  type CountdownTone,
} from "@/pages/Quiz/components/countdown-ring";

interface QuizTimerProps {
  /** Time remaining (seconds) — the countdown starts from this value. */
  initialTime: number;
  /**
   * Total time for the question (seconds).
   * Used to calculate the correct arc position on resume.
   * Falls back to initialTime if not provided (fresh question).
   */
  totalTime?: number;
  onTimeUp: () => void;
  onTick?: (timeLeft: number) => void;
  size?: CountdownRingSize;
  /** When true, the countdown freezes at its current value. */
  isPaused?: boolean;
}

const LOW_TIME_FRACTION = 0.25;
const CRITICAL_TIME_FRACTION = 0.1;

export function QuizTimer({
  initialTime,
  totalTime,
  onTimeUp,
  onTick,
  size = "lg",
  isPaused = false,
}: QuizTimerProps) {
  const total = totalTime ?? initialTime;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timeUpCalledRef = useRef(false);
  // Wall-clock anchor: the timestamp at which time runs out. The displayed
  // value is always derived from this, never from counting ticks.
  const deadlineRef = useRef<number>(Date.now() + initialTime * 1000);
  const timeLeftRef = useRef(initialTime);
  const pausedAtRef = useRef<number | null>(null);

  // ── Latest-callback refs ──────────────────────────────────────────────────
  // The countdown effect below must not depend on `onTimeUp` / `onTick`
  // identity. Callers write these inline (`onTimeUp={() => setTimedOut(true)}`)
  // or derive them from an unmemoised prop, so they get a fresh identity on
  // every parent render — and an effect that restarts a countdown must never be
  // at the mercy of how often its parent happens to re-render.
  //
  // That was a real bug, not a theoretical one: a re-render storm from the
  // lobby's navigation blocker restarted this effect faster than its own 250ms
  // interval could fire, and the timer sat frozen on screen while the server
  // ran the question out and timed the player out. See
  // docs/quiz/quiz-timer.md.
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
    onTickRef.current = onTick;
  });

  // ── Anchor: once per question ─────────────────────────────────────────────
  // `initialTime` changing is what "a new question" means to this component,
  // and it is the ONLY thing that may re-anchor the deadline from scratch.
  // Anchoring anywhere else re-derives the deadline from the *rounded* display
  // value, which silently hands the player back up to a second each time.
  //
  // Declared before the pause effect on purpose: when a new question arrives
  // while paused, this clears the pause anchor so the resume below can't also
  // shift the fresh deadline.
  useEffect(() => {
    timeUpCalledRef.current = false;
    timeLeftRef.current = initialTime;
    pausedAtRef.current = null;
    deadlineRef.current = Date.now() + initialTime * 1000;
    setTimeLeft(initialTime);
  }, [initialTime]);

  // ── Pause / resume ────────────────────────────────────────────────────────
  // Push the deadline out by exactly how long we were paused. Shifting the
  // absolute deadline (rather than re-anchoring from `timeLeft`) keeps the
  // sub-second remainder, so pausing and resuming is lossless however many
  // times it happens.
  useEffect(() => {
    if (isPaused) {
      pausedAtRef.current = Date.now();
      return;
    }
    if (pausedAtRef.current !== null) {
      deadlineRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [isPaused]);

  // ── The countdown ─────────────────────────────────────────────────────────
  // Why wall-clock: mobile browsers freeze JS timers in backgrounded tabs, so
  // a decrementing interval silently *pauses* whenever the player leaves the
  // app mid-question — the display drifts ahead of the server, which keeps
  // grading against the question start time (SubmitAnswerService.cs /
  // MatchOrchestrator.cs) the whole time. We recompute from the anchored
  // deadline on every tick and on visibilitychange, so time spent away counts
  // and an expired question times out the moment the tab wakes.
  //
  // Dependencies are two primitives and nothing else. Anything that made this
  // list depend on a function or object identity would reintroduce the freeze.
  useEffect(() => {
    if (isPaused) return;

    const sync = () => {
      if (timeUpCalledRef.current) return;

      const remaining = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000)
      );
      if (remaining !== timeLeftRef.current) {
        // Audible countdown for the final seconds — only on genuine 1s steps,
        // so a catch-up jump after backgrounding doesn't fire a tick burst.
        if (
          remaining > 0 &&
          remaining <= 5 &&
          remaining === timeLeftRef.current - 1
        ) {
          audio.play("tick");
        }
        timeLeftRef.current = remaining;
        setTimeLeft(remaining);
        onTickRef.current?.(remaining);
      }
      if (remaining <= 0) {
        timeUpCalledRef.current = true;
        onTimeUpRef.current();
      }
    };

    // Sync immediately as well as on the interval: on resume the display should
    // be right on the next paint, not up to 250ms later.
    sync();

    // 250ms cadence: cheap, and the display recovers quickly after the browser
    // throttles timers. visibilitychange resyncs instantly on wake.
    const id = setInterval(sync, 250);
    document.addEventListener("visibilitychange", sync);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [initialTime, isPaused]);

  // Arc share — based on total question time, not just remaining. `timeLeft > total` is
  // representable: a caller can pass an `initialTime` derived from a server deadline and a
  // `totalTime` that is the question's nominal limit, and the two only agree if the clocks do.
  // The ring clamps it rather than winding past a full circle.
  const fraction = total > 0 ? timeLeft / total : 0;
  const tone: CountdownTone =
    fraction < CRITICAL_TIME_FRACTION ? "critical" : fraction < LOW_TIME_FRACTION ? "low" : "normal";

  return <CountdownRing fraction={fraction} value={String(timeLeft)} unit="sec" tone={tone} size={size} />;
}
