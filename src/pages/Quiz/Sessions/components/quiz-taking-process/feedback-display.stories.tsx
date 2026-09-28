import type { Meta, StoryObj } from "@storybook/react";

import { FeedbackDisplay } from "./feedback-display";
import { AnswerStatus } from "@/types/quiz-session-types";

/**
 * The instant-feedback panel a player sees after each answer.
 *
 * The explanation stories are the ones worth looking at: it is sent on a right answer too, and the
 * quiz stops auto-advancing while one is on screen (docs/quiz/question-explanations.md).
 */
const meta = {
  title: "Quiz/FeedbackDisplay",
  component: FeedbackDisplay,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FeedbackDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  scoreAwarded: 0,
  isQuizComplete: false,
  timeSpentInSeconds: 4.2,
};

export const Correct: Story = {
  args: { result: { ...base, status: AnswerStatus.Correct, scoreAwarded: 1000 } },
};

export const IncorrectWithExplanation: Story = {
  args: {
    result: {
      ...base,
      status: AnswerStatus.Incorrect,
      readingAllowanceSeconds: 10,
      explanation:
        "Condensation is when water vapour cools and turns back into liquid — it's how clouds and dew form.",
    },
  },
};

export const CorrectWithExplanation: Story = {
  args: {
    result: {
      ...base,
      status: AnswerStatus.Correct,
      scoreAwarded: 1000,
      readingAllowanceSeconds: 10,
      explanation: "Rome has been the capital of Italy since 1871, after unification.",
    },
  },
};

export const TimedOutWithExplanation: Story = {
  args: {
    result: {
      ...base,
      status: AnswerStatus.TimedOut,
      readingAllowanceSeconds: 10,
      explanation: "Au comes from the Latin word for gold, aurum.",
    },
  },
};
