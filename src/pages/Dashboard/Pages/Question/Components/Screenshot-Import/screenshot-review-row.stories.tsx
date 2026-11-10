import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QuestionType } from "@/types/question-types";
import { toReviewRow } from "./review-model";
import type { ScreenshotQuestion } from "./screenshot-import-api";
import { ScreenshotReviewRow } from "./screenshot-review-row";

/**
 * Every state a screenshot-import review row can be in (docs/quiz/screenshot-import.md), so each
 * can be seen before it's met with a real screenshot: an answer read off the image, one the model
 * filled in, a possible duplicate, a picture-is-the-question row, and one missing its category.
 */
const base: ScreenshotQuestion = {
  type: QuestionType.MultipleChoice,
  seenType: QuestionType.MultipleChoice,
  text: "What is the capital of Kosovo?",
  correctAnswer: "Prishtina",
  wrongOptions: ["Prizren", "Peja", "Gjakova"],
  acceptableAnswers: ["Pristina"],
  explanation: null,
  answerFromImage: true,
  optionsFromImage: true,
  needsItsPicture: false,
  imageQuery: null,
  categoryId: 2,
  difficultyId: 2,
  languageId: 2,
  duplicateOfId: null,
};

const categories = [
  { id: 1, name: "Unspecified" },
  { id: 2, name: "Geography" },
  { id: 3, name: "History" },
] as never[];
const difficulties = [
  { id: 1, level: "Unspecified", weight: 0 },
  { id: 2, level: "Easy", weight: 1 },
] as never[];
const languages = [
  { id: 1, language: "Unspecified" },
  { id: 2, language: "English" },
] as never[];

const meta = {
  title: "Dashboard/Questions/ScreenshotImport/ReviewRow",
  component: ScreenshotReviewRow,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}>
        <ul className="max-w-2xl">
          <Story />
        </ul>
      </QueryClientProvider>
    ),
  ],
  args: {
    row: toReviewRow(base, 1, 0),
    categories,
    difficulties,
    languages,
    onChange: fn(),
  },
} satisfies Meta<typeof ScreenshotReviewRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AnswerFromTheImage: Story = {};

export const AnswerSuggested: Story = {
  args: {
    row: toReviewRow(
      {
        ...base,
        text: "In which year did Skanderbeg die?",
        seenType: QuestionType.TypeTheAnswer,
        correctAnswer: "1468",
        wrongOptions: ["1443", "1479", "1450"],
        answerFromImage: false,
        optionsFromImage: false,
        imageQuery: "Skanderbeg",
        categoryId: 3,
      },
      2,
      0,
    ),
  },
};

export const TrueFalse: Story = {
  args: {
    row: toReviewRow(
      {
        ...base,
        type: QuestionType.TrueFalse,
        seenType: QuestionType.TrueFalse,
        text: "The Danube flows into the Black Sea.",
        correctAnswer: "true",
        wrongOptions: [],
      },
      2,
      1,
    ),
  },
};

export const PossibleDuplicate: Story = {
  args: {
    row: toReviewRow({ ...base, text: "What is the capital of France?", correctAnswer: "Paris", duplicateOfId: 412 }, 3, 0),
  },
};

export const NeedsItsPicture: Story = {
  args: {
    row: toReviewRow(
      { ...base, text: "Tell me what is missing from this flag", needsItsPicture: true, imageQuery: "Flag of Montenegro" },
      4,
      0,
    ),
  },
};

export const MissingCategory: Story = {
  args: { row: toReviewRow({ ...base, categoryId: null }, 1, 1) },
};
