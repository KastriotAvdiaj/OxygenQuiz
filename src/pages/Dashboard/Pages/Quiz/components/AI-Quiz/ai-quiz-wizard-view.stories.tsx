import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QuestionType } from "@/types/question-types";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";

import { AiGenerateError } from "../../api/generate-ai-quiz";
import { AiQuizWizardView } from "./ai-quiz-wizard-view";
import { parseAiOutput, type ParseResult } from "./parse-ai-output";
import { AI_QUESTION_LIMITS } from "./prompt";

/**
 * The AI quiz wizard, end to end, with no backend and no LLM.
 *
 * `AiQuizWizardView` is presentational (the container `ai-quiz-wizard.tsx` owns the
 * queries, the generate call, the clipboard and the parse), so every state below is
 * reachable from plain args — including the generation failures catalogued in
 * docs/quiz/ai-quiz-generation-flow.md §5 and the parse failures in
 * docs/quiz/ai-quiz-architecture.md §6, both of which are otherwise awkward to reproduce
 * because they need a *specific* bad reply or a provider outage.
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

/** Same parse context the container derives from the suggestions plus any user overrides. */
const parseContext = {
  categoryId: 1,
  languageId: 1,
  quizDifficultyId: 2,
  difficulties,
};

const parse = (rawReply: string): ParseResult => parseAiOutput(rawReply, parseContext);

// ── Fixture LLM replies ────────────────────────────────────────────────────────────────

const GOOD_REPLY = JSON.stringify({
  title: "The Water Cycle",
  category: "Science",
  language: "English",
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

/** Two usable questions, three the parser must drop for different reasons. */
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

/** Matches `Ai:DefaultDailyQuota` — two a day, and the wizard says so before you spend one. */
const quotaAvailable = {
  enabled: true,
  limit: 2,
  used: 0,
  remaining: 2,
  resetsAt: "2026-08-10T00:00:00Z",
};

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
    mode: "Topic",
    topic: "",
    sourceData: "",
    title: "",
    description: "",
    categoryId: null,
    languageId: null,
    difficultyId: null,
    questionCount: 10,
    allowedTypes: [
      QuestionType.MultipleChoice,
      QuestionType.TrueFalse,
      QuestionType.TypeTheAnswer,
    ],
    extraInstructions: "",
    isGenerating: false,
    generateError: null,
    quota: quotaAvailable,
    needsConfirmation: false,
    suggestedCategoryName: null,
    suggestedLanguageName: null,
    copied: false,
    isCopying: false,
    aiResponse: "",
    parseResult: null,
    onModeChange: fn(),
    onTopicChange: fn(),
    onSourceDataChange: fn(),
    onTitleChange: fn(),
    onDescriptionChange: fn(),
    onCategoryIdChange: fn(),
    onLanguageIdChange: fn(),
    onDifficultyIdChange: fn(),
    onQuestionCountChange: fn(),
    onToggleType: fn(),
    onExtraInstructionsChange: fn(),
    onGenerate: fn(),
    onStartOver: fn(),
    onCopyPrompt: fn(),
    onAiResponseChange: fn(),
    onImport: fn(),
  },
} satisfies Meta<typeof AiQuizWizardView>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── The one box ────────────────────────────────────────────────────────────────────────

/** Where the wizard opens: a topic, a Generate button, everything else folded away. */
export const Empty: Story = {};

/** Generate lights up as soon as there's a topic — no other field is required. */
export const TopicEntered: Story = {
  args: { topic: "The French Revolution" },
};

/** The user opened Advanced and overrode things the AI would otherwise have chosen. */
export const AdvancedOverridden: Story = {
  args: {
    topic: "The French Revolution",
    title: "Revolution: the short version",
    categoryId: 2,
    languageId: 1,
    difficultyId: 3,
    questionCount: AI_QUESTION_LIMITS.maxGeneratedQuestions,
    extraInstructions: "Focus on dates, exam style.",
  },
};

/** Deselecting every type blocks generation — the prompt needs at least one. */
export const NoTypesSelected: Story = {
  args: { topic: "The French Revolution", allowedTypes: [] },
};

export const Generating: Story = {
  args: { topic: "The French Revolution", isGenerating: true },
};

/**
 * Generate stays clickable on an empty form — pressing it explains what's missing instead of
 * greying out and leaving the user to guess.
 *
 * A `play` function rather than an arg, because the "has the user tried yet?" flag is local
 * to the view: it's transient feedback, and lifting it to the container so a story could set
 * it would put a validation blush in the wizard's state.
 */
export const ValidationOnEmptyTopic: Story = {
  args: { topic: "" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /generate/i }));
  },
};

/** Same, for the other mode: source material needs more than a stray sentence. */
export const ValidationOnShortSource: Story = {
  args: { mode: "Source", sourceData: "Too short." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /generate/i }));
  },
};

// ── Source mode ────────────────────────────────────────────────────────────────────────

export const SourceModeEmpty: Story = {
  args: { mode: "Source" },
};

export const SourceModeReady: Story = {
  args: { mode: "Source", sourceData: SOURCE_MATERIAL },
};

/** Past the soft cap — an amber warning, not a block; the server truncates. */
export const SourceModeTooLong: Story = {
  args: {
    mode: "Source",
    sourceData: SOURCE_MATERIAL.repeat(
      Math.ceil(AI_QUESTION_LIMITS.sourceWarningLength / SOURCE_MATERIAL.length) + 1,
    ),
  },
};

// ── Generation failures (docs/quiz/ai-quiz-generation-flow.md §5) ──────────────────────
// Each code is a different offer: retry, wait, verify, or fall back to copy-paste.

/** Transient. The panel says the allowance wasn't touched, because it wasn't. */
export const ErrorProviderUnavailable: Story = {
  args: {
    topic: "The French Revolution",
    generateError: new AiGenerateError(
      "ProviderUnavailable",
      "The quiz generator is unavailable right now. Please try again in a moment.",
    ),
  },
};

export const ErrorProviderTimeout: Story = {
  args: {
    topic: "The French Revolution",
    generateError: new AiGenerateError(
      "ProviderTimeout",
      "The quiz generator took too long to respond. Please try again.",
    ),
  },
};

/** Two unreadable replies in a row. Copy-paste is offered as the way through. */
export const ErrorModelOutputInvalid: Story = {
  args: {
    topic: "The French Revolution",
    generateError: new AiGenerateError(
      "ModelOutputInvalid",
      "The AI's reply couldn't be read. Try again, or copy the prompt into your own AI instead.",
    ),
  },
};

/** Staff (Admin / SuperAdmin) have no daily cap — but still show up in the cost ledger. */
export const QuotaUnlimitedForStaff: Story = {
  args: {
    topic: "The French Revolution",
    quota: { enabled: true, limit: null, used: 7, remaining: null, resetsAt: "2026-08-10T00:00:00Z" },
  },
};

/** One left: called out in amber, because running out mid-thought is the bad surprise. */
export const QuotaLastOne: Story = {
  args: {
    topic: "The French Revolution",
    quota: { ...quotaAvailable, used: 1, remaining: 1 },
  },
};

/** Terminal for today: the Generate button is replaced by the copy-paste path. */
export const ErrorQuotaExceeded: Story = {
  args: {
    topic: "The French Revolution",
    quota: { ...quotaAvailable, used: 2, remaining: 0 },
    generateError: new AiGenerateError(
      "QuotaExceeded",
      "You've used all 2 AI generations for today. You can still copy the prompt into your own AI, or try again tomorrow.",
      "2026-08-10T00:00:00Z",
    ),
  },
};

export const ErrorEmailNotVerified: Story = {
  args: {
    topic: "The French Revolution",
    generateError: new AiGenerateError(
      "EmailNotVerified",
      "Verify your email address to generate quizzes with AI.",
    ),
  },
};

/** The kill switch, or a blown budget. Copy-paste opens automatically. */
export const FeatureDisabled: Story = {
  args: {
    topic: "The French Revolution",
    quota: { ...quotaAvailable, enabled: false },
  },
};

// ── Confirming what the AI couldn't match ──────────────────────────────────────────────

/**
 * The questions are fine; the model named a category we don't have. Rather than throw the
 * generation away, ask for the one missing field.
 */
export const NeedsCategoryConfirmation: Story = {
  args: {
    topic: "The French Revolution",
    needsConfirmation: true,
    suggestedCategoryName: "European History",
    languageId: 1,
  },
};

export const NeedsCategoryAndLanguageConfirmation: Story = {
  args: {
    topic: "Historia e Shqipërisë",
    needsConfirmation: true,
    suggestedCategoryName: "European History",
    suggestedLanguageName: "Shqip",
  },
};

// ── Copy-paste fallback ────────────────────────────────────────────────────────────────

export const FallbackPromptCopied: Story = {
  args: { topic: "The French Revolution", copied: true },
};

export const FallbackPreparingPrompt: Story = {
  args: { topic: "The French Revolution", isCopying: true },
};

/** The model answered conversationally instead of emitting JSON. */
export const ImportErrorNoJson: Story = {
  args: {
    mode: "Source",
    sourceData: SOURCE_MATERIAL,
    aiResponse: NO_JSON_REPLY,
    parseResult: parse(NO_JSON_REPLY),
  },
};

/** Valid JSON, wrong schema — usually someone's own prompt rather than ours. */
export const ImportErrorWrongShape: Story = {
  args: {
    mode: "Source",
    sourceData: SOURCE_MATERIAL,
    aiResponse: WRONG_SHAPE_REPLY,
    parseResult: parse(WRONG_SHAPE_REPLY),
  },
};

/** Right shape, but not one question survived validation: the batch is rejected whole. */
export const ImportErrorAllInvalid: Story = {
  args: {
    mode: "Source",
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

/** The happy path. Topic mode, so the banner carries the fact-check nudge. */
export const ReviewHandoff: Story = {
  args: {
    topic: "The Water Cycle",
    parseResult: goodResult,
    builderSlot: <BuilderStandIn result={goodResult} />,
  },
};

/** Same questions from source material — no fact-check nudge, because there's a source. */
export const ReviewHandoffFromSource: Story = {
  args: {
    mode: "Source",
    sourceData: SOURCE_MATERIAL,
    parseResult: goodResult,
    builderSlot: <BuilderStandIn result={goodResult} />,
  },
};

/** The reply arrived wrapped in prose and code fences. */
export const ReviewHandoffFromFencedReply: Story = {
  args: {
    mode: "Source",
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
    topic: "The Water Cycle",
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
    topic: "The Water Cycle",
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

export const OnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { topic: "The French Revolution" },
};

/** Advanced open on a phone: the options row collapses to one column, chips wrap. */
export const AdvancedOnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { ...AdvancedOverridden.args },
};
