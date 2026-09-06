import { useEffect, useRef, useState } from "react";
import type { SessionResumeState } from "@/types/quiz-session-types";

/**
 * What `POST /quizsessions/{id}/resolve-and-resume` would do if the player pressed Resume at
 * a given instant — computed locally, so the "Session In Progress" screen can show the clock
 * still running instead of a snapshot that was already stale when it arrived.
 *
 * This is a PREDICTION and never an authority. The server redoes the whole walk on resume and
 * its answer is the one that counts; if the two ever disagree, the server is right and this
 * file is the bug. See docs/quiz/session-resume-screen.md.
 */
export interface ResumeProjection {
  /** Questions that would be auto-timed-out the moment Resume is pressed. */
  skippedCount: number;
  /** The question they would land on, 1-based within the quiz. Null once nothing is left. */
  landingQuestionNumber: number | null;
  /** Whole seconds that question would open with — the number the countdown shows. */
  secondsRemaining: number | null;
  /** That question's full limit, so the ring can show what fraction is left. */
  timeLimitInSeconds: number | null;
  /** True once the walk has consumed every remaining question: Resume goes straight to results. */
  isComplete: boolean;
  /**
   * Server-clock ms at which this projection next changes — the instant the landing question's
   * window closes. Null when nothing is counting down (no question was in flight, or the quiz
   * has already run out), and that null IS the screen's signal to render a still frame instead
   * of a timer.
   */
  nextChangeAtMs: number | null;
}

/**
 * The backend hands back `DateTime` values with a `Z` (Npgsql maps `timestamptz` to
 * `DateTimeKind.Utc`, and System.Text.Json writes the designator for those). A value that ever
 * arrived without one would be parsed as LOCAL time by `Date.parse`, quietly shifting every
 * countdown on this screen by the viewer's UTC offset — hours of phantom time in either
 * direction. Cheap to rule out, expensive to debug, so rule it out.
 */
function parseUtc(iso: string): number {
  return Date.parse(/[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
}

/**
 * Replays `QuizSessionService.ResolveAndResumeAsync` step for step. Read the two together —
 * the step numbers below are its step numbers, and any change there has to land here.
 *
 * @param serverNowMs "now" on the SERVER's clock (see `useResumeProjection` for how the offset
 *                    is measured). Passing the device clock straight in is the bug this
 *                    parameter exists to make visible.
 */
export function projectResume(
  state: SessionResumeState,
  answeredCount: number,
  serverNowMs: number
): ResumeProjection {
  const complete: ResumeProjection = {
    skippedCount: 0,
    landingQuestionNumber: null,
    secondsRemaining: null,
    timeLimitInSeconds: null,
    isComplete: true,
    nextChangeAtMs: null,
  };

  const pending = state.pendingQuestions;
  if (pending.length === 0) return complete;

  // A question is only counting down if it was served AND is still unanswered. Either half
  // missing means no clock is running: the backend clears its tracking and resumes on the first
  // pending question with its full limit, which is a still frame, not a countdown.
  const currentIndex =
    state.currentQuestionStartTime !== null && state.currentQuizQuestionId !== null
      ? pending.findIndex((q) => q.quizQuestionId === state.currentQuizQuestionId)
      : -1;

  // No question in flight means no clock: whatever the player lands on starts when they press
  // Resume, so nothing on this screen decays and there is nothing to count down.
  const isCountingDown = currentIndex !== -1;

  let skippedCount = 0;
  let overflowSeconds = 0;
  let remaining = pending;

  // --- Step 1: the question in flight ---
  if (currentIndex !== -1) {
    const current = pending[currentIndex];
    const startedAtMs = parseUtc(state.currentQuestionStartTime!);
    const elapsed = (serverNowMs - startedAtMs) / 1000;

    // `<=`, not `<`: the backend resumes a question whose elapsed time exactly equals its limit.
    if (elapsed <= current.timeLimitInSeconds) {
      return {
        skippedCount: 0,
        landingQuestionNumber: answeredCount + 1,
        // `limit - floor(elapsed)` is what BuildResumeOnCurrentQuestion hands the player, so it
        // is what the screen promises. (It equals ceil(limit - elapsed) — same number, and the
        // one QuizTimer would display.)
        secondsRemaining: Math.max(0, current.timeLimitInSeconds - Math.floor(elapsed)),
        timeLimitInSeconds: current.timeLimitInSeconds,
        isComplete: false,
        nextChangeAtMs: startedAtMs + current.timeLimitInSeconds * 1000,
      };
    }

    skippedCount = 1;
    overflowSeconds = elapsed - current.timeLimitInSeconds;
    // Note the backend removes only this question and then walks the list from the START — so an
    // unanswered question ORDERED BEFORE the current one is burned by the overflow before the
    // ones after it. That is not obviously intended, but it is what resume does, and a screen
    // that predicts something else would be lying about it.
    remaining = pending.filter((q) => q.quizQuestionId !== current.quizQuestionId);
  }

  // --- Step 2: burn the overflow through whatever is left ---
  for (const question of remaining) {
    if (overflowSeconds >= question.timeLimitInSeconds) {
      skippedCount++;
      overflowSeconds -= question.timeLimitInSeconds;
      continue;
    }

    return {
      skippedCount,
      landingQuestionNumber: answeredCount + skippedCount + 1,
      // `(int)overflowSeconds` on the server — truncation, not rounding.
      secondsRemaining: question.timeLimitInSeconds - Math.floor(overflowSeconds),
      timeLimitInSeconds: question.timeLimitInSeconds,
      isComplete: false,
      // Resume RE-ANCHORS this question to the moment it is pressed, so its real deadline does
      // not exist yet. What is genuinely fixed is when this projection stops being true: the
      // instant the unburned remainder of this window runs out and the question joins the
      // skipped pile. Null when no clock is running — then this question is simply waiting, and
      // a countdown on screen would be inventing urgency the server does not have.
      nextChangeAtMs: isCountingDown
        ? serverNowMs + (question.timeLimitInSeconds - overflowSeconds) * 1000
        : null,
    };
  }

  // --- Step 3: everything ran out ---
  return { ...complete, skippedCount };
}

/**
 * `projectResume`, re-evaluated as the clock moves.
 *
 * Built on the same model as QuizTimer and for the same reason (docs/quiz/quiz-timer.md): the
 * external system is the wall clock, nothing counts ticks, and every value is re-derived from
 * absolute timestamps. A tick that never fires — a backgrounded phone, a throttled tab — costs
 * nothing, because the next one computes the right answer from scratch and the screen catches
 * up in one frame.
 *
 * The interval is 1000ms rather than QuizTimer's 250ms: this screen displays whole seconds and
 * nothing here is load-bearing for scoring, so a quarter-second of lag is invisible.
 * `visibilitychange` still resyncs immediately, which is the case that actually matters — a
 * player comes back to this tab expecting the number to be right, not a second stale.
 */
export function useResumeProjection(
  state: SessionResumeState | null | undefined,
  answeredCount: number
): ResumeProjection | null {
  // Device clock minus server clock, measured once. A phone whose clock has drifted would
  // otherwise be shown time it does not have (or free time it never earned) — the same skew
  // multiplayer corrects for every round.
  //
  // The measurement is taken at first render rather than at response arrival, so it also
  // absorbs the render delay and reads as a slightly EARLIER server "now" — i.e. it errs
  // towards showing a beat more time than there is. That is the harmless direction here:
  // nothing is submitted from this screen, and pressing Resume re-derives everything
  // server-side.
  const clockOffsetMsRef = useRef<number | null>(null);
  if (state && clockOffsetMsRef.current === null) {
    clockOffsetMsRef.current = Date.now() - parseUtc(state.serverTimeUtc);
  }
  const clockOffsetMs = clockOffsetMsRef.current ?? 0;

  const [projection, setProjection] = useState<ResumeProjection | null>(() =>
    state ? projectResume(state, answeredCount, Date.now() - clockOffsetMs) : null
  );

  // Dependencies are the three things that genuinely mean "recompute from scratch" and nothing
  // else. `state` is the server payload (a new object only when the session is refetched);
  // `answeredCount` shifts the question numbering; `clockOffsetMs` is measured once. Adding a
  // callback or a derived object here would restart the interval on every parent render — the
  // failure mode documented in quiz-timer.md, where the clock froze on screen while the server
  // kept counting.
  useEffect(() => {
    if (!state) {
      setProjection(null);
      return;
    }

    const sync = () => {
      setProjection(projectResume(state, answeredCount, Date.now() - clockOffsetMs));
    };

    sync();
    const id = setInterval(sync, 1000);
    document.addEventListener("visibilitychange", sync);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [state, answeredCount, clockOffsetMs]);

  return projection;
}
