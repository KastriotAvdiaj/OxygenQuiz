import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QuestionType } from "@/types/question-types";

import {
  ALL_INVALID_REPLY,
  NO_JSON_REPLY,
  WRONG_SHAPE_REPLY,
  categories,
  difficulties,
  languages,
  parse,
} from "./__fixtures__/ai-quiz.fixtures";
import { OwnAiQuizView } from "./own-ai-quiz-view";

/**
 * The bring-your-own-AI page: describe the quiz, copy the prompt, come back with a reply.
 *
 * The states worth looking at are the ones you can't produce on demand in a browser — a
 * clipboard mid-flight, a model that answered in prose, a reply where every question failed
 * validation. Same two decorators as the wizard's stories and for the same reasons (router
 * links; the entity selects consult React Query); see docs/development/storybook.md.
 *
 * Fixtures live in `__fixtures__/ai-quiz.fixtures.ts` because both AI paths render the same
 * lookups and the same failures — see docs/quiz/ai-quiz-two-paths.md.
 */
const meta = {
  title: "Dashboard/Quiz/OwnAiQuizView",
  component: OwnAiQuizView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, enabled: false } },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Story />
          </MemoryRouter>
        </QueryClientProvider>
      );
    },
  ],
  args: {
    categories,
    difficulties,
    languages,
    isLoadingEntities: false,
    generatePath: "/dashboard/quizzes/create-quiz/ai/topic",
    manualCreatePath: "/dashboard/quizzes/create-quiz",
    topic: "",
    title: "",
    description: "",
    categoryId: null,
    languageId: null,
    difficultyId: null,
    questionCount: 5,
    allowedTypes: [QuestionType.MultipleChoice],
    extraInstructions: "",
    copied: false,
    isCopying: false,
    promptToCopyByHand: null,
    aiResponse: "",
    parseResult: null,
    needsConfirmation: false,
    suggestedCategoryName: null,
    suggestedLanguageName: null,
    onTopicChange: fn(),
    onTitleChange: fn(),
    onDescriptionChange: fn(),
    onCategoryIdChange: fn(),
    onLanguageIdChange: fn(),
    onDifficultyIdChange: fn(),
    onQuestionCountChange: fn(),
    onToggleType: fn(),
    onExtraInstructionsChange: fn(),
    onCopyPrompt: fn(),
    onAiResponseChange: fn(),
    onImport: fn(),
    onStartOver: fn(),
  },
} satisfies Meta<typeof OwnAiQuizView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Where the page opens: the same question the wizard asks, then the two steps. */
export const Empty: Story = {};

export const TopicEntered: Story = {
  args: { topic: "The French Revolution" },
};

/** The prompt is on the clipboard — the button says so for 2.5s, then goes back. */
export const PromptCopied: Story = {
  args: { topic: "The French Revolution", copied: true },
};

/** The prompt comes from the server, so there's a moment where it hasn't arrived yet. */
export const PreparingPrompt: Story = {
  args: { topic: "The French Revolution", isCopying: true },
};

/**
 * Copy stays clickable on an empty form: pressing it says what's missing instead of greying
 * out. Same rule, and the same guard, as Generate on the wizard.
 */
export const ValidationOnEmptyTopic: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /copy prompt/i }));
  },
};

/** And the same for the reply box: pressing Review with nothing pasted explains itself. */
export const ValidationOnEmptyPaste: Story = {
  args: { topic: "The French Revolution" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /review questions/i }),
    );
  },
};

/**
 * The clipboard refused the write — a slow server eats the click's transient activation, and
 * Safari is stricter than Chrome about it. The prompt is already in hand, so it goes on screen
 * rather than into an apology.
 */
export const ClipboardBlocked: Story = {
  args: {
    topic: "The French Revolution",
    promptToCopyByHand:
      'You are writing a quiz about "The French Revolution".\n\nReturn JSON of the shape ' +
      '{ "title": string, "category": string, "language": string, "questions": [...] } and ' +
      "nothing else.",
  },
};

// ── What the user pastes back, when it's wrong ─────────────────────────────────────────

/** The model answered conversationally instead of emitting JSON. */
export const ImportErrorNoJson: Story = {
  args: {
    topic: "The Water Cycle",
    aiResponse: NO_JSON_REPLY,
    parseResult: parse(NO_JSON_REPLY),
  },
};

/** Valid JSON, wrong schema — usually someone's own prompt rather than ours. */
export const ImportErrorWrongShape: Story = {
  args: {
    topic: "The Water Cycle",
    aiResponse: WRONG_SHAPE_REPLY,
    parseResult: parse(WRONG_SHAPE_REPLY),
  },
};

/** Right shape, but not one question survived validation: the batch is rejected whole. */
export const ImportErrorAllInvalid: Story = {
  args: {
    topic: "The Water Cycle",
    aiResponse: ALL_INVALID_REPLY,
    parseResult: parse(ALL_INVALID_REPLY),
  },
};

// ── Confirming what the reply couldn't place ───────────────────────────────────────────

/**
 * The questions are fine; the model named a category we don't have. The page asks for the
 * one missing field rather than throwing the reply away — the wizard's behaviour exactly,
 * because it is literally the same component.
 */
export const NeedsCategoryConfirmation: Story = {
  args: {
    topic: "The French Revolution",
    needsConfirmation: true,
    suggestedCategoryName: "European History",
    languageId: 1,
  },
};

// ── Lookup query states ────────────────────────────────────────────────────────────────
// Only loading. A lookup *failure* throws to the route's error element, so there is no
// in-view state to story — see docs/development/error-handling.md.

export const LoadingEntities: Story = {
  args: { isLoadingEntities: true },
};

// ── Responsive check (docs/RESPONSIVE.md: verify at 360/390px) ─────────────────────────

export const OnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { topic: "The French Revolution", copied: true },
};
