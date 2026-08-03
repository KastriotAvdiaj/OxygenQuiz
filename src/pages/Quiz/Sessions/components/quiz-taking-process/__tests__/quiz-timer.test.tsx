import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

import { QuizTimer } from "../quiz-timer";

// The timer plays a tick sound in the last five seconds. Nothing here is about audio, and jsdom
// has no audio stack.
vi.mock("@/lib/audio", () => ({
  audio: { play: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() },
}));

/**
 * Regression tests for the question timer's countdown. These are all about *stability under
 * re-render*, which is the property that broke in production: the countdown effect used to depend
 * on `onTimeUp`'s identity, so a parent that re-rendered faster than the timer's own 250ms
 * interval tore the interval down and re-anchored the deadline before it could ever fire. The
 * number sat frozen on screen while the server ran the question out.
 *
 * The rendered digit is the assertion target on purpose — it is what the player is actually
 * misled by, and it stays meaningful through any future refactor of the internals.
 *
 * See docs/quiz/quiz-timer.md.
 */

const readSeconds = () => {
  // The component renders "<n>" and a "sec" label; the digits are the only numeric text.
  const node = screen.getByText(/^\d+$/);
  return Number(node.textContent);
};

/** Advance both the fake clock and `Date.now()`, then let effects/state flush. */
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("QuizTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fake timers also fake Date.now(), so the wall-clock deadline moves with the interval —
    // which is the only reason a deadline-derived countdown is testable at all.
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down from initialTime", () => {
    render(<QuizTimer initialTime={30} totalTime={30} onTimeUp={vi.fn()} />);
    expect(readSeconds()).toBe(30);

    advance(1000);
    expect(readSeconds()).toBe(29);

    advance(5000);
    expect(readSeconds()).toBe(24);
  });

  it("keeps counting while the parent re-renders with a fresh onTimeUp identity", () => {
    // The shape of the original bug: an inline arrow, new on every render.
    const { rerender } = render(
      <QuizTimer initialTime={30} totalTime={30} onTimeUp={() => {}} />
    );

    // Re-render every 100ms of a 10-second stretch — faster than the 250ms interval, which is
    // what made the freeze total rather than merely slow.
    for (let elapsed = 0; elapsed < 10_000; elapsed += 100) {
      rerender(<QuizTimer initialTime={30} totalTime={30} onTimeUp={() => {}} />);
      advance(100);
    }

    expect(readSeconds()).toBe(20);
  });

  it("fires onTimeUp exactly once, even under a re-render storm", () => {
    const onTimeUp = vi.fn();
    const { rerender } = render(
      <QuizTimer initialTime={3} totalTime={3} onTimeUp={onTimeUp} />
    );

    for (let elapsed = 0; elapsed < 6000; elapsed += 100) {
      rerender(<QuizTimer initialTime={3} totalTime={3} onTimeUp={onTimeUp} />);
      advance(100);
    }

    expect(readSeconds()).toBe(0);
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it("never gains time across a pause and resume", () => {
    const { rerender } = render(
      <QuizTimer initialTime={30} totalTime={30} onTimeUp={vi.fn()} isPaused={false} />
    );

    advance(5000); // 25 left
    expect(readSeconds()).toBe(25);

    rerender(<QuizTimer initialTime={30} totalTime={30} onTimeUp={vi.fn()} isPaused />);
    advance(10_000); // frozen: still 25
    expect(readSeconds()).toBe(25);

    rerender(
      <QuizTimer initialTime={30} totalTime={30} onTimeUp={vi.fn()} isPaused={false} />
    );
    expect(readSeconds()).toBe(25);

    advance(5000); // resumes from where it stopped, not from a re-rounded value
    expect(readSeconds()).toBe(20);
  });

  it("re-anchors when the question changes", () => {
    const { rerender } = render(
      <QuizTimer initialTime={30} totalTime={30} onTimeUp={vi.fn()} />
    );
    advance(10_000);
    expect(readSeconds()).toBe(20);

    // A new question: a different initialTime is the only thing that may reset the countdown.
    rerender(<QuizTimer initialTime={15} totalTime={15} onTimeUp={vi.fn()} />);
    expect(readSeconds()).toBe(15);

    advance(3000);
    expect(readSeconds()).toBe(12);
  });

  it("does not wind the arc past full when initialTime exceeds totalTime", () => {
    // Representable in production: `initialTime` is derived from the server's deadline while
    // `totalTime` is the question's nominal limit, and the two only agree if the clocks do.
    // `multiplayer-question-view` clamps its input, but the ring shouldn't depend on that.
    render(<QuizTimer initialTime={34} totalTime={30} onTimeUp={vi.fn()} />);

    // Circles are [background track, glow, progress arc]. The glow is a plain <circle>, so its
    // attribute is React's own render output rather than something framer-motion may be driving.
    const glow = document.querySelectorAll("circle")[1];
    expect(Number(glow.getAttribute("stroke-dashoffset"))).toBe(0);
  });
});
