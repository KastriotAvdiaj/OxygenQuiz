import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QuestionType } from "@/types/question-types";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";

import { AiQuizWizardView } from "./ai-quiz-wizard-view";
import { parseAiOutput, type ParseResult } from "./parse-ai-output";
import { AI_QUESTION_LIMITS } from "./prompt";

/**
 * The AI quiz wizard, end to end, with no backend and no LLM.
 *
 * `AiQuizWizardView` is presentational (the container `ai-quiz-wizard.tsx` owns the
 * queries, clipboard and parse call), so every state below is reachable from plain args —
 * including the failure modes catalogued in docs/quiz/ai-quiz-architecture.md §6, which
 * are otherwise awkward to reproduce because they need a *specific* bad LLM reply.
 *
 * The parse-result stories call the **real `parseAiOutput`** on fixture replies rather
 * than hand-writing a `ParseResult`. A hand-written result would keep rendering happily
 * after a parser regression; this way a change in what the parser drops, clamps or falls
 * back on shows up visually here.
 */

// ── Fixtures ───────────────────────────────────────────────────────────────────────────
// Typed against the real lookup types, so a field added to them breaks this file rather
// than silently rendering a half-populated dropdown.

const categories: QuestionCategory[] = [
  { id: 1, name: "Science", createdAt: "", colorPaletteJson: "", gradient: false, username: "admin" },
  { id: 2, name: "History", createdAt: "", colorPaletteJson: "", gradient: false, username: "admin" },
  { id: 3, name: "Geography", createdAt: "", colorPaletteJson: "", gradient: false, username: "admin" },
];

const difficulties: QuestionDifficulty[] = [
  { id: 1, level: "Easy", weight: 1, createdAt: "", username: "admin" },
  { id: 2, level: "Medium", weight: 2, createdAt: "", username: "admin" },
  { id: 3, level: "Hard", weight: 3, createdAt: "", username: "admin" },
];

const languages: QuestionLanguage[] = [
  { id: 1, language: "English", createdAt: "", username: "admin" },
  { id: 2, language: "Albanian", createdAt: "", username: "admin" },
];

const SOURCE_MATERIAL = `The water cycle describes the continuous movement of water on, above and below the
surface of the Earth. Water evaporates from oceans and lakes, condenses into clouds,
falls as precipitation, and returns to the sea through rivers and groundwater.`;

/** Same parse context the container builds from step 1's choices. */
const parseContext = {
  categoryId: 1,
  languageId: 1,
  quizDifficultyId: 2,
  difficulties,
};

const parse = (rawReply: string): ParseResult =>
  parseAiOutput(rawReply, parseContext);

// ── Fixture LLM replies ────────────────────────────────────────────────────────────────

const GOOD_REPLY = JSON.stringify({
  questions: [
    {
      type: QuestionType.MultipleChoice,
      text: "Which process turns water vapour back into liquid?",
      difficulty: "Easy",
      pointSystem: "Standard",
      timeLimitInSeconds: 20,
      answerOptions: [
        { text: "Condensation", isCorrect: true },
        { text: "Evaporation", isCorrect: false },
        { text: "Precipitation", isCorrect: false },
        { text: "Infiltration", isCorrect: false },
      ],
      allowMultipleSelections: false,
    },
    {
      type: QuestionType.TrueFalse,
      text: "Groundwater can return water to the sea.",
      difficulty: "Medium",
      pointSystem: "Standard",
      timeLimitInSeconds: 15,
      correctAnswer: true,
    },
    {
      type: QuestionType.TypeTheAnswer,
      text: "What is the name for water falling from clouds?",
      difficulty: "Hard",
      pointSystem: "Double",
      timeLimitInSeconds: 30,
      correctAnswer: "Precipitation",
      acceptableAnswers: ["rain", "rainfall"],
      isCaseSensitive: false,
    },
  ],
});

/** Real models wrap JSON in prose and code fences; `extractJson` is expected to cope. */
const FENCED_REPLY = `Sure! Here's a quiz based on your material:

\`\`\`json
${GOOD_REPLY}
\`\`\`

Let me know if you'd like more questions!`;

/** Two usable questions, two the parser must drop for different reasons. */
const PARTIALLY_INVALID_REPLY = JSON.stringify({
  questions: [
    {
      type: QuestionType.MultipleChoice,
      text: "Which process turns water vapour back into liquid?",
      difficulty: "Easy",
      answerOptions: [
        { text: "Condensation", isCorrect: true },
        { text: "Evaporation", isCorrect: false },
      ],
    },
    {
      // Dropped: only one option.
      type: QuestionType.MultipleChoice,
      text: "Where does most evaporation happen?",
      difficulty: "Easy",
      answerOptions: [{ text: "The oceans", isCorrect: true }],
    },
    {
      // Dropped: nothing marked correct.
      type: QuestionType.MultipleChoice,
      text: "Which of these is part of the water cycle, and by the way this question text is long enough to be truncated in the summary list?",
      difficulty: "Medium",
      answerOptions: [
        { text: "Condensation", isCorrect: false },
        { text: "Sublimation", isCorrect: false },
      ],
    },
    {
      // Dropped: TrueFalse needs a boolean.
      type: QuestionType.TrueFalse,
      text: "Water evaporates from lakes.",
      difficulty: "Easy",
      correctAnswer: "yes",
    },
    {
      type: QuestionType.TrueFalse,
      text: "Clouds form by condensation.",
      difficulty: "Medium",
      correctAnswer: true,
    },
  ],
});

/** Difficulties the model invented, plus a point system and time limit out of bounds. */
const UNKNOWN_DIFFICULTY_REPLY = JSON.stringify({
  questions: [
    {
      type: QuestionType.TrueFalse,
      text: "Rivers carry water back to the sea.",
      difficulty: "Fiendish",
      pointSystem: "Legendary",
      timeLimitInSeconds: 9000,
      correctAnswer: true,
    },
    {
      type: QuestionType.TrueFalse,
      text: "Water vapour is a gas.",
      difficulty: "trivial",
      correctAnswer: true,
    },
    {
      type: QuestionType.TrueFalse,
      text: "Precipitation includes snow.",
      difficulty: "Easy",
      correctAnswer: true,
    },
  ],
});

const NO_JSON_REPLY =
  "I'd be happy to help you build a quiz! Could you tell me a bit more about the " +
  "audience and how difficult you'd like the questions to be?";

const WRONG_SHAPE_REPLY = JSON.stringify({
  quiz: { title: "The Water Cycle", items: [{ q: "What is evaporation?" }] },
});

const ALL_INVALID_REPLY = JSON.stringify({
  questions: [
    { type: QuestionType.MultipleChoice, text: "No options at all", difficulty: "Easy" },
    { type: QuestionType.TrueFalse, text: "Not a boolean", difficulty: "Easy", correctAnswer: "maybe" },
    { type: QuestionType.TypeTheAnswer, text: "Empty answer", difficulty: "Easy", correctAnswer: "  " },
  ],
});

/**
 * Stand-in for the real prefilled builder, which owns mutations and its own context
 * provider (that's why it's a slot prop, not part of the view). Listing what the parser
 * produced makes these stories a readable check on the handoff payload.
 */
const BuilderStandIn = ({ result }: { result: ParseResult }) => (
  <div className="mx-auto w-full max-w-[1600px] rounded-xl border-2 border-dashed border-border p-5">
    <p className="text-sm font-semibold">
      [ builderSlot ] — CreateQuizForm renders here, prefilled and in aiImportMode
    </p>
    <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground list-decimal pl-5">
      {result.questions.map(({ question, settings }) => (
        <li key={question.id}>
          <span className="font-medium text-foreground">{question.text}</span>
          {" — "}
          {question.type} · difficulty #{question.difficultyId} · {settings.pointSystem} ·{" "}
          {settings.timeLimitInSeconds}s · {question.visibility}
        </li>
      ))}
    </ol>
  </div>
);

// ── Meta ───────────────────────────────────────────────────────────────────────────────

/**
 * Two decorators, both required:
 *
 * - **MemoryRouter** — the header's "Back to quizzes" and "Create manually instead" are
 *   react-router `Link`s and throw outside a router.
 * - **QueryClientProvider** — the view itself is hook-free, but the three entity selects
 *   consult `useCanSelectUnspecifiedLookup` → `useUser` (React Query) to decide whether to
 *   offer the seeded "Unspecified" lookup. Without a client they throw. The fixtures
 *   contain no "Unspecified" row, so the resolved role doesn't change what renders;
 *   `retry: false` just keeps a doomed /Authentication/me call from retrying in a loop.
 *   This is the "component genuinely needs a context provider" case in
 *   docs/development/storybook.md §6.
 */
const meta = {
  title: "Dashboard/Quiz/AiQuizWizardView",
  component: AiQuizWizardView,
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
    hasEntityError: false,
    quizzesPath: "/dashboard/quizzes",
    manualCreatePath: "/dashboard/quizzes/create-quiz",
    step: 1,
    title: "",
    description: "",
    categoryId: null,
    languageId: null,
    difficultyId: null,
    sourceData: "",
    questionCount: 10,
    allowedTypes: [
      QuestionType.MultipleChoice,
      QuestionType.TrueFalse,
      QuestionType.TypeTheAnswer,
    ],
    extraInstructions: "",
    copied: false,
    aiResponse: "",
    parseResult: null,
    onStepChange: fn(),
    onTitleChange: fn(),
    onDescriptionChange: fn(),
    onCategoryIdChange: fn(),
    onLanguageIdChange: fn(),
    onDifficultyIdChange: fn(),
    onSourceDataChange: fn(),
    onQuestionCountChange: fn(),
    onToggleType: fn(),
    onExtraInstructionsChange: fn(),
    onCopyPrompt: fn(),
    onAiResponseChange: fn(),
    onImport: fn(),
  },
} satisfies Meta<typeof AiQuizWizardView>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Step 1: quiz details ───────────────────────────────────────────────────────────────

/** Where the wizard opens. "Next" is disabled until title + all three lookups are set. */
export const Step1Empty: Story = {};

/** A title alone isn't enough — the gate needs category, language and difficulty too. */
export const Step1TitleOnly: Story = {
  args: { title: "The Water Cycle" },
};

export const Step1Complete: Story = {
  args: {
    title: "The Water Cycle",
    description: "A short quiz on evaporation, condensation and precipitation.",
    categoryId: 1,
    languageId: 1,
    difficultyId: 2,
  },
};

// ── Step 2: generate & import ──────────────────────────────────────────────────────────

const step1Values = {
  step: 2 as const,
  title: "The Water Cycle",
  description: "A short quiz on evaporation, condensation and precipitation.",
  categoryId: 1,
  languageId: 1,
  difficultyId: 2,
};

/** Nothing pasted yet: "Copy prompt" is disabled and says why. */
export const Step2Empty: Story = {
  args: { ...step1Values },
};

export const Step2Ready: Story = {
  args: { ...step1Values, sourceData: SOURCE_MATERIAL },
};

/** Confirmation state after a successful clipboard write; the container resets it on a timer. */
export const Step2PromptCopied: Story = {
  args: { ...step1Values, sourceData: SOURCE_MATERIAL, copied: true },
};

/** Deselecting every type also blocks generation — the prompt needs at least one. */
export const Step2NoTypesSelected: Story = {
  args: { ...step1Values, sourceData: SOURCE_MATERIAL, allowedTypes: [] },
};

export const Step2SingleTypeSelected: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    allowedTypes: [QuestionType.MultipleChoice],
  },
};

/** Past the soft cap most context windows truncate at — an amber warning, not a block. */
export const Step2SourceTooLong: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL.repeat(
      Math.ceil(AI_QUESTION_LIMITS.sourceWarningLength / SOURCE_MATERIAL.length) + 1
    ),
    extraInstructions: "Focus on the vocabulary, exam style.",
  },
};

export const Step2AtMaxQuestionCount: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    questionCount: AI_QUESTION_LIMITS.maxQuestions,
  },
};

// ── Import failures (docs/quiz/ai-quiz-architecture.md §6) ─────────────────────────────

/** The model answered conversationally instead of emitting JSON. */
export const ImportErrorNoJson: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    aiResponse: NO_JSON_REPLY,
    parseResult: parse(NO_JSON_REPLY),
  },
};

/** Valid JSON, wrong schema — usually someone's own prompt rather than ours. */
export const ImportErrorWrongShape: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    aiResponse: WRONG_SHAPE_REPLY,
    parseResult: parse(WRONG_SHAPE_REPLY),
  },
};

/** Right shape, but not one question survived validation: the batch is rejected whole. */
export const ImportErrorAllInvalid: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    aiResponse: ALL_INVALID_REPLY,
    parseResult: parse(ALL_INVALID_REPLY),
  },
};

// ── The review handoff ─────────────────────────────────────────────────────────────────

const goodResult = parse(GOOD_REPLY);
const fencedResult = parse(FENCED_REPLY);
const partialResult = parse(PARTIALLY_INVALID_REPLY);
const fallbackResult = parse(UNKNOWN_DIFFICULTY_REPLY);

/** The happy path: three questions imported, builder takes over. */
export const ReviewHandoff: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    aiResponse: GOOD_REPLY,
    parseResult: goodResult,
    builderSlot: <BuilderStandIn result={goodResult} />,
  },
};

/** Same questions, but the reply arrived wrapped in prose and code fences. */
export const ReviewHandoffFromFencedReply: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    aiResponse: FENCED_REPLY,
    parseResult: fencedResult,
    builderSlot: <BuilderStandIn result={fencedResult} />,
  },
};

/**
 * Partial success — the point of the summary banner. Bad questions are dropped with a
 * reason instead of sinking the import, and the user is told which ones.
 */
export const ReviewHandoffWithDroppedQuestions: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    aiResponse: PARTIALLY_INVALID_REPLY,
    parseResult: partialResult,
    builderSlot: <BuilderStandIn result={partialResult} />,
  },
};

/**
 * Invented difficulty names fall back to the quiz's own difficulty (never create a new
 * row), and out-of-range scoring is clamped — visible in the stand-in's per-question line.
 */
export const ReviewHandoffWithDifficultyFallbacks: Story = {
  args: {
    ...step1Values,
    sourceData: SOURCE_MATERIAL,
    aiResponse: UNKNOWN_DIFFICULTY_REPLY,
    parseResult: fallbackResult,
    builderSlot: <BuilderStandIn result={fallbackResult} />,
  },
};

// ── Lookup query states ────────────────────────────────────────────────────────────────

export const LoadingEntities: Story = {
  args: { isLoadingEntities: true },
};

export const EntityLoadError: Story = {
  args: { hasEntityError: true },
};

// ── Responsive checks (docs/RESPONSIVE.md: verify at 360/390px) ────────────────────────

export const Step1OnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { ...Step1Complete.args },
};

/** The options row collapses to one column below `sm`; the type chips wrap. */
export const Step2OnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { ...step1Values, sourceData: SOURCE_MATERIAL },
};
