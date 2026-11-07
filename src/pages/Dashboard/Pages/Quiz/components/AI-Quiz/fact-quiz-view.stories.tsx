import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";

import { QuestionType } from "@/types/question-types";

import type { FactPack } from "../../api/fact-quiz";
import { categories, languages } from "./__fixtures__/ai-quiz.fixtures";
import { FactQuizView } from "./fact-quiz-view";

/**
 * "From facts" (docs/quiz/fact-quizzes.md): pick a set of Wikidata facts, a language and how many
 * questions, and the server builds the quiz with no model. The packs below are the two that ship,
 * as `GET /quiz/fact-packs` returns them (built from Wikidata on 2026-11-01).
 *
 * Once the reply parses, the page hands over to the same review as the AI pages — see
 * `Dashboard/Quiz/AiQuizWizardView` → `Review*`, and `Dashboard/Quiz/AI/SourceNote` →
 * `GroundedOnWikidata` for the line the review shows.
 */
const capitals: FactPack = {
  slug: "capitals-of-europe",
  title: { English: "Capitals of Europe", Albanian: "Kryeqytetet e Evropës" },
  description: {
    English: "Every sovereign state in Europe and its capital.",
    Albanian: "Çdo shtet sovran i Evropës dhe kryeqyteti i tij.",
  },
  category: "Geography",
  factsByLanguage: { English: 49, Albanian: 49 },
  questionTypes: [QuestionType.MultipleChoice, QuestionType.TrueFalse, QuestionType.TypeTheAnswer],
  builtAt: "2026-11-01",
  editorialNote:
    "Every sovereign state Wikidata places in Europe, Kosovo included. States on two continents, such as Turkey and Russia, count when Wikidata places them in Europe.",
};

const peaks: FactPack = {
  slug: "peaks-of-albania",
  title: { English: "Peaks of Albania", Albanian: "Majat e Shqipërisë" },
  description: {
    English: "Albania's mountains and how high they are.",
    Albanian: "Malet e Shqipërisë dhe sa të larta janë.",
  },
  category: "Geography",
  factsByLanguage: { English: 15, Albanian: 15 },
  // A height is never typed exactly: no typed-answer style.
  questionTypes: [QuestionType.MultipleChoice, QuestionType.TrueFalse],
  builtAt: "2026-11-01",
  editorialNote:
    "Albania's mountains that at least 15 Wikipedias have an article about — the ones people have heard of. Border peaks such as Korab count. Peaks with conflicting heights on Wikidata are left out.",
};

const meta = {
  title: "Dashboard/Quiz/FactQuizView",
  component: FactQuizView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    backPath: "/dashboard/quizzes",
    generatePath: "/dashboard/quizzes/create-quiz/ai/topic",
    manualCreatePath: "/dashboard/quizzes/create-quiz",
    packs: [capitals, peaks],
    isLoadingPacks: false,
    packsFailed: false,
    selectedSlug: "capitals-of-europe",
    onSelectPack: fn(),
    language: "Albanian",
    onLanguageChange: fn(),
    questionCount: 10,
    onQuestionCountChange: fn(),
    allowedTypes: [QuestionType.MultipleChoice, QuestionType.TrueFalse],
    onToggleType: fn(),
    onBuild: fn(),
    isBuilding: false,
    buildError: null,
    isLoadingEntities: false,
    parseResult: null,
    needsConfirmation: false,
    categories,
    languages,
    effectiveCategoryId: null,
    onCategoryIdChange: fn(),
    effectiveLanguageId: null,
    onLanguageIdChange: fn(),
    suggestedCategoryName: null,
    suggestedLanguageName: null,
    onStartOver: fn(),
  },
} satisfies Meta<typeof FactQuizView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page as it opens: the first pack picked, Albanian, ready to build. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Build the quiz/ }));
    await expect(args.onBuild).toHaveBeenCalled();
  },
};

export const InEnglish: Story = {
  args: { language: "English" },
};

/**
 * Peaks can't be typed — a height is never asked exactly — so that type is off and can't be
 * turned on. With only it selected, Build waits for a type the pack can ask.
 */
export const PeaksWithOnlyTypedSelected: Story = {
  args: { selectedSlug: "peaks-of-albania", allowedTypes: [QuestionType.TypeTheAnswer] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("checkbox", { name: /Type The Answer/ })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /Build the quiz/ })).toBeDisabled();
  },
};

export const Building: Story = {
  args: { isBuilding: true },
};

/** The server refused — its reason, said next to the button. */
export const BuildFailed: Story = {
  args: { buildError: "This pack doesn't have enough facts in that language for a quiz." },
};

export const PacksFailedToLoad: Story = {
  args: { packs: [], packsFailed: true, selectedSlug: null },
};

export const LoadingPacks: Story = {
  args: { isLoadingPacks: true },
};

export const OnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const OnMobileEnglish: Story = {
  args: { language: "English", selectedSlug: "peaks-of-albania" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
