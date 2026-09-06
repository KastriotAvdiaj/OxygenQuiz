import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { QuizInterface } from "./quiz-interface";
import { QuestionType } from "@/types/question-types";
import {
  AnswerStatus,
  type CurrentQuestion,
  type InstantFeedbackAnswerResult,
} from "../../../../../types/quiz-session-types";

/**
 * Teaching example: a PAGE-level flow rendered without the backend.
 *
 * The quiz route normally drives QuizInterface from a live session: it opens a
 * SignalR/HTTP connection, fetches the current question, submits answers, etc.
 * That orchestration lives in HOOKS and route wrappers — NOT inside QuizInterface.
 *
 * QuizInterface itself is presentational: hand it a `currentQuestion` +
 * `lastAnswerResult` and it renders that exact screen. So we can preview every
 * state of the quiz — fresh question, instant feedback, final question, loading —
 * instantly, with hand-written fake data and no real quiz session. This is the
 * "test it in my own time instead of playing through" workflow you wanted.
 *
 * The two states worth reading carefully are at the bottom: FirstQuestionLoading and
 * FetchingNextQuestion.
 *
 * KEY TAKEAWAY: you don't story the data-fetching wrapper; you story the
 * presentational component it renders. Keeping fetching in hooks and rendering in
 * prop-driven components is what makes a page storyable at all.
 */
const sampleQuestion: CurrentQuestion = {
  quizQuestionId: 1,
  questionText: "What is the chemical symbol for Oxygen?",
  options: [
    { id: 1, text: "O" },
    { id: 2, text: "Ox" },
    { id: 3, text: "O₂" },
    { id: 4, text: "Og" },
  ],
  timeLimitInSeconds: 30,
  timeRemainingInSeconds: 30,
  questionType: QuestionType.MultipleChoice,
  instantFeedback: true,
};

const meta = {
  title: "Quiz/QuizInterface",
  component: QuizInterface,
  parameters: { layout: "fullscreen" },
  // Shared defaults for every story; individual stories override what they need.
  args: {
    sessionId: "demo-session",
    quizTitle: "Chemistry Basics",
    category: "Science",
    isSubmitting: false,
    onNextQuestion: fn(),
    onSubmitAnswer: fn(),
    // Production always passes this, so the stories do too — without it the Leave button
    // does not render and every story below would be missing the quiz's only exit.
    onLeave: fn(),
  },
} satisfies Meta<typeof QuizInterface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new question, waiting for the user to answer. */
export const FreshQuestion: Story = {
  args: {
    currentQuestion: sampleQuestion,
    lastAnswerResult: null,
    showInstantFeedback: false,
  },
};

/** Just answered correctly, mid-quiz: feedback + "Next" button + auto-advance countdown. */
export const AnsweredCorrectly: Story = {
  args: {
    currentQuestion: sampleQuestion,
    showInstantFeedback: true,
    lastAnswerResult: {
      status: AnswerStatus.Correct,
      scoreAwarded: 100,
      isQuizComplete: false,
      correctOptionId: 1,
      timeSpentInSeconds: 8,
    } satisfies InstantFeedbackAnswerResult,
  },
};

/** Final question answered: shows "Finish" (no countdown) instead of "Next". */
export const FinalQuestionComplete: Story = {
  args: {
    currentQuestion: sampleQuestion,
    showInstantFeedback: true,
    lastAnswerResult: {
      status: AnswerStatus.Correct,
      scoreAwarded: 100,
      isQuizComplete: true,
      correctOptionId: 1,
      timeSpentInSeconds: 5,
    } satisfies InstantFeedbackAnswerResult,
  },
};

/**
 * Cold start: the session exists but its first question is still in flight. The ONLY time
 * `currentQuestion` is null — from the second question on, `fetchNextQuestion` holds the one
 * on screen until its replacement arrives, so there is no gap and no loader between questions
 * (docs/quiz/quiz-playing-architecture.md §3d).
 *
 * The old between-questions loading state used to live here, and before that it was
 * unreachable: QuizPage gated on `useQuizSession.isInitialLoading`, which ORs in
 * `!currentQuestion`, so the page short-circuited to its own full-screen card and
 * QuizInterface was never rendered without a question.
 */
export const FirstQuestionLoading: Story = {
  args: {
    currentQuestion: null,
    lastAnswerResult: null,
    showInstantFeedback: false,
  },
};

/**
 * Next pressed, the request in flight, the answered question still on screen. This is what a
 * slow network looks like now: a spinner in the Next button, the countdown gone, and nothing
 * else moving. Compare it with AnsweredCorrectly — same screen, one changed prop.
 */
export const FetchingNextQuestion: Story = {
  args: {
    currentQuestion: sampleQuestion,
    showInstantFeedback: true,
    isFetchingNextQuestion: true,
    lastAnswerResult: {
      status: AnswerStatus.Correct,
      scoreAwarded: 100,
      isQuizComplete: false,
      correctOptionId: 1,
      timeSpentInSeconds: 8,
    } satisfies InstantFeedbackAnswerResult,
  },
};
