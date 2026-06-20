import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { MultiplayerGame } from "./MultiplayerGame";
import type {
  useMatch,
  ScoreboardEntry,
  RoundQuestionView,
} from "../../hooks/use-match";

/**
 * Multiplayer match view, storied without SignalR.
 *
 * MultiplayerGame is presentational: it receives the whole match state as a `match`
 * prop and renders off `match.phase`. The real-time SignalR connection lives in the
 * useMatch() hook — NOT in this component — so we can fake `match` and preview every
 * phase of a match (countdown → question → reveal → results) with no server and no
 * second player.
 *
 * `import type` above means useMatch's SignalR/connection code is never bundled here;
 * we only borrow its return type so the mock can't drift out of sync with the hook.
 */
type Match = ReturnType<typeof useMatch>;

// An ISO timestamp `s` seconds in the future. Used for the live question deadline so
// the on-screen timer starts from a sensible number each time the story mounts.
const inSeconds = (s: number) => new Date(Date.now() + s * 1000).toISOString();

const scoreboard: ScoreboardEntry[] = [
  { username: "You", score: 1200, correct: 4 },
  { username: "Ada", score: 950, correct: 3 },
  { username: "Linus", score: 600, correct: 2 },
];

/**
 * A complete, valid `match` with sensible defaults; each story overrides only the
 * fields its phase needs. Typed as the real useMatch() return, so adding a field to
 * the hook will surface as a compile error right here.
 */
const makeMatch = (overrides: Partial<Match>): Match => ({
  phase: "idle",
  isActive: true,
  countdownSeconds: 3,
  question: null,
  deadlineUtc: null,
  answered: [],
  hasSubmitted: false,
  lastResult: null,
  scoreboard,
  matchResult: null,
  submit: fn(async () => {}),
  reset: fn(),
  ...overrides,
});

const mcQuestion: RoundQuestionView = {
  index: 1,
  total: 5,
  questionId: 101,
  type: "MultipleChoice",
  text: "What is the chemical symbol for Oxygen?",
  timeLimitSeconds: 30,
  options: [
    { id: 1, text: "O" },
    { id: 2, text: "Ox" },
    { id: 3, text: "O₂" },
    { id: 4, text: "Og" },
  ],
};

const tfQuestion: RoundQuestionView = {
  index: 2,
  total: 5,
  questionId: 102,
  type: "TrueFalse",
  text: "Oxygen makes up about 21% of Earth's atmosphere.",
  timeLimitSeconds: 20,
  options: [],
};

const meta = {
  title: "Quiz/Multiplayer/MultiplayerGame",
  component: MultiplayerGame,
  parameters: { layout: "fullscreen" },
  args: {
    username: "You",
    onExit: fn(),
    // Default keeps the story type-safe (match is required); every story overrides it.
    match: makeMatch({}),
  },
} satisfies Meta<typeof MultiplayerGame>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Phase 1: countdown before the first question ──────────────────────────────
export const Countdown: Story = {
  args: { match: makeMatch({ phase: "starting", countdownSeconds: 3 }) },
};

// ── Phase 2: a live question ──────────────────────────────────────────────────
// Uses `render` so the deadline (and therefore the ticking timer) is fresh on mount.
export const QuestionMultipleChoice: Story = {
  render: (args) => (
    <MultiplayerGame
      {...args}
      match={makeMatch({
        phase: "question",
        question: mcQuestion,
        deadlineUtc: inSeconds(25),
        answered: ["Ada"],
      })}
    />
  ),
};

export const QuestionTrueFalse: Story = {
  render: (args) => (
    <MultiplayerGame
      {...args}
      match={makeMatch({
        phase: "question",
        question: tfQuestion,
        deadlineUtc: inSeconds(18),
      })}
    />
  ),
};

/** Player has locked in their answer and is waiting for the others. */
export const QuestionAnswered: Story = {
  render: (args) => (
    <MultiplayerGame
      {...args}
      match={makeMatch({
        phase: "question",
        question: mcQuestion,
        deadlineUtc: inSeconds(12),
        hasSubmitted: true,
        answered: ["You", "Ada"],
      })}
    />
  ),
};

// ── Phase 3: between-question reveal ──────────────────────────────────────────
export const RevealCorrect: Story = {
  args: {
    match: makeMatch({
      phase: "reveal",
      lastResult: {
        index: 1,
        questionId: 101,
        scoreboard,
        players: [
          { username: "You", answered: true, isCorrect: true, pointsAwarded: 850, totalScore: 1200 },
          { username: "Ada", answered: true, isCorrect: false, pointsAwarded: 0, totalScore: 950 },
          { username: "Linus", answered: false, isCorrect: false, pointsAwarded: 0, totalScore: 600 },
        ],
      },
    }),
  },
};

export const RevealIncorrect: Story = {
  args: {
    match: makeMatch({
      phase: "reveal",
      scoreboard: [
        { username: "Ada", score: 950, correct: 3 },
        { username: "You", score: 350, correct: 1 },
      ],
      lastResult: {
        index: 1,
        questionId: 101,
        scoreboard,
        players: [
          { username: "You", answered: true, isCorrect: false, pointsAwarded: 0, totalScore: 350 },
          { username: "Ada", answered: true, isCorrect: true, pointsAwarded: 850, totalScore: 950 },
        ],
      },
    }),
  },
};

// ── Phase 4: final results ────────────────────────────────────────────────────
export const ResultsYouWin: Story = {
  args: {
    match: makeMatch({
      phase: "ended",
      matchResult: { scoreboard, winnerUsername: "You" },
    }),
  },
};

export const ResultsOpponentWins: Story = {
  args: {
    match: makeMatch({
      phase: "ended",
      scoreboard: [
        { username: "Ada", score: 1400, correct: 5 },
        { username: "You", score: 1200, correct: 4 },
        { username: "Linus", score: 600, correct: 2 },
      ],
      matchResult: {
        scoreboard: [
          { username: "Ada", score: 1400, correct: 5 },
          { username: "You", score: 1200, correct: 4 },
          { username: "Linus", score: 600, correct: 2 },
        ],
        winnerUsername: "Ada",
      },
    }),
  },
};
