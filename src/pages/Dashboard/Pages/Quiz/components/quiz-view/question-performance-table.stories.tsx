import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";

import { QuestionType, type AnyQuestion } from "@/types/question-types";
import type { QuizQuestionAnalyticsRow } from "@/types/analytics-types";
import type { QuizQuestionDTO } from "@/types/quiz-types";

import { QuestionPerformanceTable } from "./question-performance-table";
import { MIN_ANSWERS_FOR_RATE } from "./thresholds";

/**
 * The merged questions-and-performance list — the core of the quiz page redesign.
 *
 * These stories exist mostly to pin the **low-data rules**, which are the part most likely to
 * regress and the part that matters most: nearly every real quiz sits on a handful of attempts,
 * so "what does this look like with almost no data" *is* the normal case, not an edge case.
 *
 * See docs/proposals/quiz-view-redesign.md §5.
 */

const difficulty = { id: 1, level: "Medium", weight: 2, createdAt: "" };
const category = { id: 1, name: "History", emoji: "📜" };
const language = { id: 1, language: "English", createdAt: "" };
const user = { id: "u1", username: "author" };

const base = {
  visibility: "Public",
  difficulty,
  category,
  language,
  imageUrl: "",
  createdAt: "2026-06-16T10:00:00Z",
  user,
} as const;

const mc = (id: number, text: string): AnyQuestion => ({
  ...base,
  id,
  text,
  type: QuestionType.MultipleChoice,
  allowMultipleSelections: false,
  answerOptions: [
    { id: id * 10 + 1, text: "The Mayflower", isCorrect: true },
    { id: id * 10 + 2, text: "The Beagle", isCorrect: false },
    { id: id * 10 + 3, text: "The Endeavour", isCorrect: false },
  ],
} as AnyQuestion);

const typed = (id: number, text: string): AnyQuestion => ({
  ...base,
  id,
  text,
  type: QuestionType.TypeTheAnswer,
  correctAnswer: "Mayflower",
  isCaseSensitive: false,
  allowPartialMatch: false,
  acceptableAnswers: ["Mayflower ship"],
} as AnyQuestion);

const entry = (question: AnyQuestion, orderInQuiz: number): QuizQuestionDTO => ({
  quizId: 27,
  questionId: question.id,
  timeLimitInSeconds: 10,
  pointSystem: "Standard",
  orderInQuiz,
  question,
});

const questions: QuizQuestionDTO[] = [
  entry(mc(1, "Which ship carried the Pilgrims to America in 1620?"), 1),
  entry(mc(2, "In which year did the Second World War end?"), 2),
  entry(typed(3, "Name the ship that carried the Pilgrims."), 3),
];

const stats = (
  questionId: number,
  timesAnswered: number,
  correctRate: number,
  averageTimeSeconds = 4.2
): QuizQuestionAnalyticsRow => ({
  questionId,
  order: questionId,
  text: "",
  type: "MultipleChoice",
  timesAnswered,
  correctCount: Math.round((correctRate / 100) * timesAnswered),
  incorrectCount: timesAnswered - Math.round((correctRate / 100) * timesAnswered),
  correctRate,
  averageTimeSeconds,
});

const meta = {
  title: "Dashboard/Quiz/QuestionPerformanceTable",
  component: QuestionPerformanceTable,
  parameters: { layout: "padded" },
  args: { questions, analytics: [] },
} satisfies Meta<typeof QuestionPerformanceTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Healthy data: every question has enough answers for its rate to mean something. */
export const WithData: Story = {
  args: {
    analytics: [stats(1, 40, 82), stats(2, 38, 71), stats(3, 36, 64)],
  },
};

/**
 * A question under 50% gets an accent border and a "Needs a look" badge in place of its type.
 * The badge is a prompt, not a verdict — a genuinely hard question looks identical from here.
 */
export const FlaggedQuestion: Story = {
  args: {
    analytics: [stats(1, 40, 82), stats(2, 30, 38), stats(3, 36, 64)],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Needs a look")).toBeInTheDocument();
    // The heading counts them, so an author scanning the page sees it before the rows.
    await expect(
      await canvas.findByText(/1 of 3 are answered correctly less than half/i),
    ).toBeInTheDocument();
  },
};

/**
 * **The important one.** Below `MIN_ANSWERS_FOR_RATE` answers, the rate is suppressed entirely
 * rather than printed off one or two responses — and nothing is flagged, because a 33% built
 * from three answers is not evidence of a bad question.
 */
export const NotEnoughAnswersYet: Story = {
  args: {
    analytics: [
      stats(1, MIN_ANSWERS_FOR_RATE - 1, 33),
      stats(2, 1, 0),
      stats(3, 2, 100),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Needs a look")).not.toBeInTheDocument();
    // No percentage anywhere: not "0%", not "100%".
    await expect(canvas.queryByText(/%$/)).not.toBeInTheDocument();
  },
};

/**
 * Analytics unavailable (the query 404'd, or nobody has played yet). The questions still list —
 * this is the only place in the app that shows a quiz's questions, so it cannot depend on stats.
 */
export const NoAnalytics: Story = {
  args: { analytics: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/Which ship carried the Pilgrims/i),
    ).toBeInTheDocument();
  },
};

/** A quiz with no questions yet — reachable straight after creating one. */
export const NoQuestions: Story = {
  args: { questions: [], analytics: [] },
};
