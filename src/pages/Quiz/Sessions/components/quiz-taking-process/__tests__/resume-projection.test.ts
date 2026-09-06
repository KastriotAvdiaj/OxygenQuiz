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
});
