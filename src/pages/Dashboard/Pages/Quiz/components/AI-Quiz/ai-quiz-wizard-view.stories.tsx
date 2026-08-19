import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QuestionType } from "@/types/question-types";

import { AiGenerateError } from "../../api/generate-ai-quiz";
import {
  SOURCE_MATERIAL,
  categories,
  difficulties,
  languages,
  parse,
} from "./__fixtures__/ai-quiz.fixtures";
import { AiQuizWizardView } from "./ai-quiz-wizard-view";
import type { ParseResult } from "./parse-ai-output";
import { AI_QUESTION_LIMITS, DEFAULT_QUESTION_COUNT } from "./prompt";

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
// Lookups, the source-material sample and the `parse` helper are shared with the own-AI
// page's stories (`__fixtures__/ai-quiz.fixtures.ts`), because both paths render the same
// entities and the same parser. What stays here are the replies only this path shows.

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
 * - **MemoryRouter** — the header's Back control and the blocked-state "use your own AI"
 *   link navigate with react-router and throw outside a router.
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
    quizzesPath: "/dashboard/quizzes",
    ownAiPath: "/dashboard/quizzes/create-quiz/ai/own",
    mode: "Topic",
    topic: "",
    sourceData: "",
    title: "",
    description: "",
    categoryId: null,
    languageId: null,
    difficultyId: null,
    questionCount: DEFAULT_QUESTION_COUNT,
    // Mirrors the container's initial state: multiple choice only.
    allowedTypes: [QuestionType.MultipleChoice],
    extraInstructions: "",
    isGenerating: false,
    generateError: null,
    quota: quotaAvailable,
    needsConfirmation: false,
    suggestedCategoryName: null,
    suggestedLanguageName: null,
    parseResult: null,
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

/**
 * Overrides set, drawer closed. The trigger carries a count because an overlay hides its
 * contents by definition — otherwise a run with five overrides looks like a default one.
 */
export const AdvancedOverridden: Story = {
  args: {
    topic: "The French Revolution",
    title: "Revolution: the short version",
    categoryId: 2,
    languageId: 1,
    difficultyId: 3,
    questionCount: AI_QUESTION_LIMITS.maxGeneratedQuestions,
    // Two of the three types, so the drawer story shows a ticked row next to an unticked one.
    allowedTypes: [QuestionType.MultipleChoice, QuestionType.TrueFalse],
    extraInstructions: "Focus on dates, exam style.",
  },
};

/** The drawer itself. Open state is local to `AdvancedOptions`, so the story clicks it open. */
export const AdvancedDrawerOpen: Story = {
  args: { ...AdvancedOverridden.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /advanced/i }));
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
//
// `/ai/material` is not a registered route yet — the method dialog shows that option as
// "Soon" (AI_MATERIAL_MODE_ENABLED in create-quiz-method-dialog.tsx). These stories stay:
// the view renders whichever field its `mode` asks for, and they are the only place the
// material screen can be reviewed until slice 2.3 registers the route.

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

/** Terminal for today: the error panel explains it and the copy-paste path is promoted. */
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

/**
 * The kill switch, or a blown budget. No Generate button — and, since this state raises no
 * error and `QuotaNote` stays silent on it, the note explaining why plus a promoted
 * "Use your own AI instead" button are the whole content of that row.
 */
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
// Only loading. A lookup *failure* throws to the route's error element, so there is no
// in-view state to story — see docs/development/error-handling.md.

export const LoadingEntities: Story = {
  args: { isLoadingEntities: true },
};

// ── Responsive checks (docs/RESPONSIVE.md: verify at 360/390px) ────────────────────────

export const OnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { topic: "The French Revolution" },
};

/**
 * The Advanced drawer on a phone. Checks the things docs/RESPONSIVE.md warns about: the 85vw
 * cap (not an edge-to-edge panel), the dvh height cap with the body scrolling under a pinned
 * header and footer, and that opening it does *not* raise the keyboard by focusing the title
 * field.
 */
export const AdvancedDrawerOnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { ...AdvancedOverridden.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /advanced/i }));
  },
};
