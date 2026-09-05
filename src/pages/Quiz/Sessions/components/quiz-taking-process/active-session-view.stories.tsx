import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { ActiveSessionView } from "./active-session-view";

/**
 * The "Session In Progress" fork: the player opened a quiz they already have an
 * unfinished session for, and has to choose before anything else happens.
 *
 * This is the screen behind an awkward state to reproduce by hand — you'd have to start a
 * quiz, abandon it mid-way, and navigate back in. As a prop-driven component it's three
 * numbers and a timestamp, so every variant below is instant.
 *
 * WHEN THE APP SHOWS THIS: create-quiz-session fails with an "active session" error,
 * useQuizSession catches it, looks the session up, and sets `existingActiveSession` —
 * QuizPage then returns this instead of the quiz (use-quiz-session.ts).
 *
 * `isLoading` is shared by both actions: Resume and Start Fresh each hit the backend, and
 * while either is in flight both buttons spin. The screen deliberately doesn't track which
 * one you pressed.
 */
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const meta = {
  title: "Quiz/ActiveSessionView",
  component: ActiveSessionView,
  parameters: { layout: "fullscreen" },
  args: {
    session: {
      quizTitle: "Chemistry Basics",
      totalQuestions: 12,
      userAnswers: Array.from({ length: 5 }),
      startTime: minutesAgo(8),
    },
    onResume: fn(),
    onRestart: fn(),
    onGoBack: fn(),
    isLoading: false,
  },
} satisfies Meta<typeof ActiveSessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The common case: walked away part-way through, came back a few minutes later. */
export const PartwayThrough: Story = {};

/**
 * Nothing answered yet — the progress bar animates to 0%. Worth its own story because a
 * zero-width bar is easy to mistake for a broken one.
 */
export const JustStarted: Story = {
  args: {
    session: {
      quizTitle: "World Capitals",
      totalQuestions: 20,
      userAnswers: [],
      startTime: minutesAgo(0),
    },
  },
};

/** One question left. Resuming here is the difference between a score and nothing. */
export const NearlyFinished: Story = {
  args: {
    session: {
      quizTitle: "World Capitals",
      totalQuestions: 20,
      userAnswers: Array.from({ length: 19 }),
      startTime: minutesAgo(34),
    },
  },
};

/**
 * A session left open for days. getRelativeTime switches units at 60 min and 24 h, and
 * the "Started" row is the only hint that Resume may be reviving something very stale.
 */
export const AbandonedDaysAgo: Story = {
  args: {
    session: {
      quizTitle: "Movie Trivia Night",
      totalQuestions: 15,
      userAnswers: Array.from({ length: 3 }),
      startTime: minutesAgo(60 * 24 * 3 + 120),
    },
  },
};

/** Mid-request: every button disabled, both actions spinning. */
export const Resuming: Story = {
  args: { isLoading: true },
};

/**
 * Defensive: totalQuestions 0 would divide by zero in the progress bar. The component
 * guards it and renders an empty bar rather than NaN%.
 */
export const NoQuestions: Story = {
  args: {
    session: {
      quizTitle: "Empty Quiz",
      totalQuestions: 0,
      userAnswers: [],
      startTime: minutesAgo(2),
    },
  },
};
