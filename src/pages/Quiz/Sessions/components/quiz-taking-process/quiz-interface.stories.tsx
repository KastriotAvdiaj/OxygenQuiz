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

/** No active question yet → the "Preparing your question…" loading state. */
export const LoadingNextQuestion: Story = {
  args: {
    currentQuestion: null,
    lastAnswerResult: null,
    showInstantFeedback: false,
  },
};
