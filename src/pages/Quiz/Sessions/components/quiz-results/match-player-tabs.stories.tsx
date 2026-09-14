import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { MatchPlayerTabs } from "./match-player-tabs";
import type { MatchPlayer } from "../../api/get-quiz-session";

/**
 * Whose answers the Question Review tab is showing, after a multiplayer match.
 *
 * Everyone who played can read everyone's answers, permanently — you were all in the same room
 * being asked the same questions, and "what did you put for number four?" is the conversation this
 * screen exists to settle (docs/quiz/multiplayer.md §7).
 *
 * THE STATES WORTH LOOKING AT are the ones that are awkward to reach in the running app: a
 * four-player match needs four accounts and four browsers, and a player who left mid-match needs
 * someone to close a tab at the right moment. They are all here as props instead.
 *
 * The row renders nothing below two players — one player is not a match to compare, and the review
 * underneath is simply theirs. `SinglePlayer` pins that, because "returns null" is exactly the kind
 * of behaviour a later refactor quietly loses.
 */
const meta = {
  title: "Quiz/MatchPlayerTabs",
  component: MatchPlayerTabs,
  parameters: { layout: "padded" },
  args: { onValueChange: fn() },
} satisfies Meta<typeof MatchPlayerTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const player = (
  name: string,
  score: number,
  overrides: Partial<MatchPlayer> = {},
): MatchPlayer => ({
  sessionId: `session-${name}`,
  userId: `user-${name}`,
  username: name,
  profileImageUrl: null,
  totalScore: score,
  correctAnswers: 3,
  leftEarly: false,
  isWinner: false,
  ...overrides,
});

const twoPlayers = [
  player("KaLoti", 3782, { isWinner: true }),
  player("admin", 3678),
];

/** The ordinary case: two players, you are the winner, your own tab is selected. */
export const TwoPlayers: Story = {
  args: {
    players: twoPlayers,
    value: "session-KaLoti",
    ownSessionId: "session-KaLoti",
  },
};

/** Reading someone else's answers — the whole reason the row exists. */
export const ViewingAnotherPlayer: Story = {
  args: {
    players: twoPlayers,
    value: "session-admin",
    ownSessionId: "session-KaLoti",
  },
};

/**
 * A full lobby, with one player who left before the end. The exit icon is on their tab rather than
 * on each of their blank questions: the reason those are empty is a fact about the player, not
 * about each question.
 */
export const FullLobbyWithALeaver: Story = {
  args: {
    players: [
      player("KaLoti", 4120, { isWinner: true, correctAnswers: 5 }),
      player("admin", 3678, { correctAnswers: 4 }),
      player("erza", 2050, { correctAnswers: 2 }),
      player("bleart", 610, { correctAnswers: 1, leftEarly: true }),
    ],
    value: "session-KaLoti",
    ownSessionId: "session-KaLoti",
  },
};

/**
 * A tie: the match recorded no winner, so no tab wears the trophy. Worth pinning — the winner is
 * stored rather than recomputed, and "nobody won" has to survive the round trip as null.
 */
export const TiedMatch: Story = {
  args: {
    players: [player("KaLoti", 3000), player("admin", 3000)],
    value: "session-KaLoti",
    ownSessionId: "session-KaLoti",
  },
};

/** Single player: the row renders nothing at all. */
export const SinglePlayer: Story = {
  args: {
    players: [player("KaLoti", 3782)],
    value: "session-KaLoti",
    ownSessionId: "session-KaLoti",
  },
};
