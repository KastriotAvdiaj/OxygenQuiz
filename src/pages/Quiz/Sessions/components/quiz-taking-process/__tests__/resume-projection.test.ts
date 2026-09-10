import { describe, it, expect } from "vitest";

import { projectResume } from "../resume-projection";
import type { SessionResumeState } from "@/types/quiz-session-types";

/**
 * `projectResume` exists to say, on the "Session In Progress" screen, what the server would do
 * if Resume were pressed right now. Its only real requirement is that it agrees with
 * `QuizSessionService.ResolveAndResumeAsync` — a screen that predicts a different question than
 * the one the player lands on is worse than the frozen snapshot it replaced.
 *
 * So these tests are written as the server's rules, not as the function's branches: each one
 * names the rule in ResolveAndResumeAsync it is pinning, and the numbers are chosen to sit on
 * the boundaries that rule turns on. See docs/quiz/session-resume-screen.md.
 */

const T0 = Date.parse("2026-09-05T12:00:00.000Z");

/** Three unanswered questions, 10s / 20s / 30s, with the first one in flight since T0. */
const state = (overrides: Partial<SessionResumeState> = {}): SessionResumeState => ({
  serverTimeUtc: new Date(T0).toISOString(),
  currentQuizQuestionId: 1,
  currentQuestionStartTime: new Date(T0).toISOString(),
  pendingQuestions: [
    { quizQuestionId: 1, timeLimitInSeconds: 10 },
    { quizQuestionId: 2, timeLimitInSeconds: 20 },
    { quizQuestionId: 3, timeLimitInSeconds: 30 },
  ],
  ...overrides,
});

/** `serverNowMs` `s` seconds after the question in flight was served. */
const after = (s: number) => T0 + s * 1000;

describe("projectResume", () => {
  describe("the question in flight", () => {
    it("resumes on it with the seconds the server would grant", () => {
      // Server: `Math.Max(0, TimeLimitInSeconds - (int)elapsed)` — truncated, not rounded, so
      // 3.9s elapsed still costs only 3 whole seconds.
      const p = projectResume(state(), 4, after(3.9));

      expect(p.skippedCount).toBe(0);
      expect(p.secondsRemaining).toBe(7);
      expect(p.timeLimitInSeconds).toBe(10);
      expect(p.landingQuestionNumber).toBe(5); // answered + 1
      expect(p.isComplete).toBe(false);
    });

    it("still resumes on it at exactly the limit", () => {
      // The server's comparison is `elapsed <= timeLimit`. One second either side of this line
      // is the difference between keeping a question and scoring zero on it, so it is pinned.
      const p = projectResume(state(), 4, after(10));

      expect(p.skippedCount).toBe(0);
      expect(p.secondsRemaining).toBe(0);
      expect(p.landingQuestionNumber).toBe(5);
    });

    it("counts down to the instant the window closes", () => {
      const p = projectResume(state(), 4, after(3.9));
      expect(p.nextChangeAtMs).toBe(T0 + 10_000);
    });

    it("times it out one tick past the limit and moves to the next question", () => {
      const p = projectResume(state(), 4, after(10.5));

      expect(p.skippedCount).toBe(1);
      expect(p.landingQuestionNumber).toBe(6); // answered 4 + skipped 1 + 1
      // 0.5s of overflow has been burned into the 20s question, and `(int)0.5` is 0.
      expect(p.secondsRemaining).toBe(20);
      expect(p.timeLimitInSeconds).toBe(20);
    });
  });

  describe("the overflow walk", () => {
    it("burns whole question windows, one after another", () => {
      // 10s (in flight) + 20s both gone; 5s of the 30s question used.
      const p = projectResume(state(), 0, after(35));

      expect(p.skippedCount).toBe(2);
      expect(p.secondsRemaining).toBe(25);
      expect(p.timeLimitInSeconds).toBe(30);
      expect(p.landingQuestionNumber).toBe(3);
    });

    it("skips a question whose overflow exactly equals its limit", () => {
      // Server: `overflowSeconds >= question.TimeLimitInSeconds` — 20s of overflow consumes the
      // whole 20s question rather than leaving it open with 0 seconds on it.
      const p = projectResume(state(), 0, after(30));

      expect(p.skippedCount).toBe(2);
      expect(p.secondsRemaining).toBe(30);
    });

    it("reports the quiz as spent once every window has passed", () => {
      const p = projectResume(state(), 0, after(999));

      expect(p.isComplete).toBe(true);
      expect(p.skippedCount).toBe(3);
      expect(p.landingQuestionNumber).toBeNull();
      expect(p.nextChangeAtMs).toBeNull();
    });
  });

  describe("when no clock is running", () => {
    // A session that was created but never served a question, or one whose tracked question has
    // since been answered. The server clears its tracking, walks from the start with zero
    // overflow, and hands back the first question at full time — nothing is decaying, so the
    // screen must not draw a countdown.
    it("lands on the first pending question at full time, with nothing counting", () => {
      const p = projectResume(
        state({ currentQuizQuestionId: null, currentQuestionStartTime: null }),
        4,
        after(600)
      );

      expect(p.skippedCount).toBe(0);
      expect(p.secondsRemaining).toBe(10);
      expect(p.landingQuestionNumber).toBe(5);
      expect(p.nextChangeAtMs).toBeNull();
    });

    it("does the same when the tracked question is no longer pending", () => {
      const p = projectResume(
        state({ currentQuizQuestionId: 99 }),
        4,
        after(600)
      );

      expect(p.skippedCount).toBe(0);
      expect(p.secondsRemaining).toBe(10);
      expect(p.nextChangeAtMs).toBeNull();
    });
  });

  describe("timestamps", () => {
    it("reads a naive server timestamp as UTC, not local time", () => {
      // Npgsql hands back Kind=Utc and System.Text.Json writes the Z, so this should never
      // happen — but if it ever did, parsing as local time would shift the whole screen by the
      // viewer's UTC offset and the countdown would silently be hours out.
      const p = projectResume(
        state({ currentQuestionStartTime: "2026-09-05T12:00:00.000" }),
        0,
        after(4)
      );

      expect(p.secondsRemaining).toBe(6);
      expect(p.skippedCount).toBe(0);
    });
  });

  it("reports a session with nothing left as complete", () => {
    const p = projectResume(state({ pendingQuestions: [] }), 3, after(0));

    expect(p.isComplete).toBe(true);
    expect(p.landingQuestionNumber).toBeNull();
  });

  /**
   * Step 0 — the check `ResolveAndResumeAsync` makes BEFORE the walk, and the one this file
   * modelled for months without knowing it existed. Getting it wrong is not a rounding error:
   * the screen promised a resume for sessions the server had already closed, and pressing the
   * button was the only way to find out.
   */
  describe("the abandonment deadline", () => {
    const withDeadline = (secondsFromT0: number) =>
      state({ abandonmentDeadline: new Date(T0 + secondsFromT0 * 1000).toISOString() });

    it("reports the session as abandoned once the deadline has passed", () => {
      const p = projectResume(withDeadline(60), 4, after(61));

      expect(p.isAbandoned).toBe(true);
      // Implies complete: there is nothing to resume onto either way.
      expect(p.isComplete).toBe(true);
      expect(p.landingQuestionNumber).toBeNull();
      expect(p.secondsRemaining).toBeNull();
    });

    it("claims nothing ran out, because abandonment does not run the walk", () => {
      // The server marks the session abandoned and returns; it creates no timed-out answers.
      // A tally here would invent a story about questions that were never resolved at all.
      const p = projectResume(withDeadline(60), 4, after(300));

      expect(p.skippedCount).toBe(0);
    });

    it("beats the walk even while a question still looks live", () => {
      // 3s into a 10s question: the walk alone would happily offer 7 more seconds on it. The
      // deadline passed a second ago, so the offer is void. This exact disagreement is the bug.
      const p = projectResume(withDeadline(2), 4, after(3));

      expect(p.isAbandoned).toBe(true);
      expect(p.secondsRemaining).toBeNull();
    });

    it("leaves a session alone right up to the deadline", () => {
      // `serverNow > deadline`, so the deadline instant itself is still live — the same
      // inclusive boundary the walk uses for `elapsed <= timeLimit`, and worth pinning for the
      // same reason: one tick either side is the difference between playing and not.
      //
      // Deadline and elapsed are set to the same 5s so the assertion below reads off the
      // question in flight rather than the tail of a walk. (This test first asserted a deadline
      // of 60s and a `serverNow` 60s into a 10-second question, which is a session whose every
      // window had already closed — it was checking step 3, not the boundary it names.)
      const p = projectResume(withDeadline(5), 4, after(5));

      expect(p.isAbandoned).toBe(false);
      expect(p.secondsRemaining).toBe(5); // still on the question in flight, halfway through
    });

    it("predicts exactly as before when the payload carries no deadline", () => {
      // Older payloads, and the reads that don't pay to compute it. No deadline means no
      // abandonment knowledge — not "abandoned", and not "definitely fine" either.
      const p = projectResume(state(), 4, after(3));

      expect(p.isAbandoned).toBe(false);
      expect(p.secondsRemaining).toBe(7);
    });
  });
});
