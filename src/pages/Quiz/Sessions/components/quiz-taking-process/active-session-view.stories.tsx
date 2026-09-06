import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { ActiveSessionView } from "./active-session-view";

/**
 * The "Session In Progress" fork: the player opened a quiz they already have an
 * unfinished session for, and has to choose before anything else happens.
 *
 * This is the screen behind an awkward state to reproduce by hand — you'd have to start a
 * quiz, abandon it mid-way, and navigate back in. As a prop-driven component it's a few
 * numbers and two timestamps, so every variant below is instant.
 *
 * WHEN THE APP SHOWS THIS: create-quiz-session fails with an "active session" error,
 * useQuizSession catches it, looks the session up, and sets `existingActiveSession` —
 * QuizPage then returns this instead of the quiz (use-quiz-session.ts).
 *
 * THE SCREEN IS LIVE. `resumeState` is the session's still-running clock, and the component
 * replays the backend's resume catch-up from it once a second: leave a story open and the
 * countdown really does run out, the tally really does move, and the whole thing really does
 * end on "Time's Up". The stories below anchor their timestamps to `Date.now()` so each one
 * opens at the moment it is describing — reload to watch it again
 * (docs/quiz/session-resume-screen.md).
 *
 * `isLoading` is shared by both actions: Resume and Start Fresh each hit the backend, and
 * while either is in flight both buttons spin. The screen deliberately doesn't track which
 * one you pressed.
 */
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const secondsAgo = (s: number) => new Date(Date.now() - s * 1000).toISOString();

/** Twelve 30-second questions, `answered` of them already done. */
const pending = (answered: number, count = 12, limit = 30) =>
  Array.from({ length: count - answered }, (_, i) => ({
    quizQuestionId: answered + i + 1,
    timeLimitInSeconds: limit,
  }));

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
      resumeState: {
        serverTimeUtc: new Date().toISOString(),
        currentQuizQuestionId: 6,
        currentQuestionStartTime: secondsAgo(8),
        pendingQuestions: pending(5),
      },
    },
    onResume: fn(),
    onRestart: fn(),
    onGoBack: fn(),
    isLoading: false,
  },
} satisfies Meta<typeof ActiveSessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The common case: stepped away eight seconds into question 6, came back with 22 to spare.
 * The ring is the live one — watch it turn amber, then red, then hand the question over.
 */
export const PartwayThrough: Story = {};

/**
 * Four seconds left. This is the state the whole feature exists for: the old screen showed
 * "5 / 12" here and said nothing about the question quietly bleeding out behind it.
 */
export const AboutToLoseTheQuestion: Story = {
  args: {
    session: {
      quizTitle: "Chemistry Basics",
      totalQuestions: 12,
      userAnswers: Array.from({ length: 5 }),
      startTime: minutesAgo(8),
      resumeState: {
        serverTimeUtc: new Date().toISOString(),
        currentQuizQuestionId: 6,
        currentQuestionStartTime: secondsAgo(26),
        pendingQuestions: pending(5),
      },
    },
  },
};

/**
 * Away long enough for two questions to expire outright and a third to be half gone. The
 * progress bar splits: answered in primary, burned in the error colour, and the tally counts
 * both because both are equally beyond saving.
 */
export const QuestionsAlreadyLost: Story = {
  args: {
    session: {
      quizTitle: "Chemistry Basics",
      totalQuestions: 12,
      userAnswers: Array.from({ length: 5 }),
      startTime: minutesAgo(3),
      resumeState: {
        serverTimeUtc: new Date().toISOString(),
        currentQuizQuestionId: 6,
        currentQuestionStartTime: secondsAgo(75),
        pendingQuestions: pending(5),
      },
    },
  },
};

/**
 * Gone long enough that every remaining window has closed. Resume no longer resumes anything —
 * the backend will complete the session and the button says so.
 */
export const EverythingRanOut: Story = {
  args: {
    session: {
      quizTitle: "Chemistry Basics",
      totalQuestions: 12,
      userAnswers: Array.from({ length: 5 }),
      startTime: minutesAgo(40),
      resumeState: {
        serverTimeUtc: new Date().toISOString(),
        currentQuizQuestionId: 6,
        currentQuestionStartTime: minutesAgo(30),
        pendingQuestions: pending(5),
      },
    },
  },
};

/**
 * A session created but never served a question — nothing is decaying, so there is deliberately
 * no countdown. A timer here would invent urgency the server doesn't have.
 */
export const NoClockRunning: Story = {
  args: {
    session: {
      quizTitle: "World Capitals",
      totalQuestions: 20,
      userAnswers: [],
      startTime: minutesAgo(0),
      resumeState: {
        serverTimeUtc: new Date().toISOString(),
        currentQuizQuestionId: null,
        currentQuestionStartTime: null,
        pendingQuestions: pending(0, 20),
      },
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
      resumeState: {
        serverTimeUtc: new Date().toISOString(),
        currentQuizQuestionId: 20,
        currentQuestionStartTime: secondsAgo(6),
        pendingQuestions: pending(19, 20),
      },
    },
  },
};

/**
 * No `resumeState` at all — an older payload, or anything that loses the field on the way
 * through. The screen degrades to the static snapshot it used to be rather than breaking:
 * no ring, no skipped tally, just answered / total.
 */
export const WithoutLiveClock: Story = {
  args: {
    session: {
      quizTitle: "Movie Trivia Night",
      totalQuestions: 15,
      userAnswers: Array.from({ length: 3 }),
      startTime: minutesAgo(60 * 24 * 3 + 120),
      resumeState: null,
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
      resumeState: null,
    },
  },
};
