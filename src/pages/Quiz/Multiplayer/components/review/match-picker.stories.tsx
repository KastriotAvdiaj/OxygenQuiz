import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { MatchPlayerTabs } from "@/pages/Quiz/Sessions/components/quiz-results/match-player-tabs";
import type { MatchPlayer } from "@/pages/Quiz/Sessions/api/get-quiz-session";
import type { MatchSummary } from "../../api/matches";
import { MatchPicker } from "./match-picker";

/**
 * The top of the lobby's match review: the "Matches" box, and under it the "Players" box
 * (docs/quiz/multiplayer.md §7.6).
 *
 * THE STATES WORTH LOOKING AT need a long evening to reach in the running app: a dozen rematches,
 * a full room. Here they are props. `ReviewHeader` puts the two boxes together the way the dialog
 * does and is clickable — pick a match and the players under it change, with you always first.
 */
const meta = {
  title: "Quiz/Multiplayer/MatchPicker",
  component: MatchPicker,
  parameters: { layout: "padded" },
  args: { onValueChange: fn(), userId: "user-admin" },
  decorators: [
    (StoryFn) => (
      // About the width the review dialog gives it.
      <div className="max-w-2xl font-quiz">
        <StoryFn />
      </div>
    ),
  ],
} satisfies Meta<typeof MatchPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const QUIZZES = [
  "Tech History Milestones",
  "Algebra and Calculus Deep Dive",
  "World Capitals",
  "Movie Quotes of the 90s",
];

/** A match between `names`, won by `winner` (or tied when it is null). Newest has the highest n. */
const match = (n: number, names: string[], winner: string | null): MatchSummary => ({
  matchId: `match-${n}`,
  lobbyKey: "lobby-1",
  roomCode: "8UZHRH",
  quizId: n,
  quizTitle: QUIZZES[n % QUIZZES.length],
  format: "Classic",
  startedAt: "2026-10-11T18:00:00Z",
  endedAt: "2026-10-11T18:05:00Z",
  players: names.map((name, i) => ({
    sessionId: `session-${n}-${name}`,
    userId: `user-${name}`,
    username: name,
    profileImageUrl: null,
    totalScore: name === winner ? 5546 : 2893 - i * 200,
    isWinner: name === winner,
  })),
});

/** Newest first, as the dialog passes them. */
const matchesOf = (count: number, names: string[]) =>
  Array.from({ length: count }, (_, i) => {
    const n = count - i;
    return match(n, names, n % 3 === 0 ? null : names[n % names.length]);
  });

const two = matchesOf(2, ["admin", "KastriotAvdiaj"]);
const many = matchesOf(13, ["admin", "KastriotAvdiaj"]);

/** The ordinary lobby: one rematch. Everything fits, so there are no arrows. */
export const TwoMatches: Story = {
  args: { matches: two, value: two[0].matchId },
};

/**
 * Thirteen matches. The row scrolls; the arrow at the right moves it along by one match, and one
 * appears on the left once there is something behind it.
 */
export const ManyMatches: Story = {
  args: { matches: many, value: many[0].matchId },
};

/** One match: nothing to choose between, so the box is not drawn. */
export const SingleMatch: Story = {
  args: { matches: matchesOf(1, ["admin", "KastriotAvdiaj"]), value: "match-1" },
};

const roomful = Array.from({ length: 12 }, (_, i) => (i === 7 ? "admin" : `player${i + 1}`));
const bigLobby = matchesOf(11, roomful);

/** Both boxes together, live: the dialog's header with a long evening in a full room. */
const Header = ({ matches }: { matches: MatchSummary[] }) => {
  const [matchId, setMatchId] = useState(matches[0].matchId);
  const current = matches.find((m) => m.matchId === matchId) ?? matches[0];
  const own = current.players.find((p) => p.userId === "user-admin")?.sessionId ?? "";
  const [sessionId, setSessionId] = useState(own);
  // The dialog remounts the players row per match (`key`); the story does the same by hand.
  const pickMatch = (id: string) => {
    setMatchId(id);
    const next = matches.find((m) => m.matchId === id) ?? matches[0];
    setSessionId(next.players.find((p) => p.userId === "user-admin")?.sessionId ?? "");
  };
  // Scoreboard order, as the API returns it: highest score first.
  const players: MatchPlayer[] = [...current.players]
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((p) => ({ ...p, correctAnswers: 3, leftEarly: false }));

  return (
    <>
      <MatchPicker matches={matches} value={matchId} onValueChange={pickMatch} userId="user-admin" />
      <MatchPlayerTabs players={players} value={sessionId} onValueChange={setSessionId} ownSessionId={own} />
    </>
  );
};

/** Two matches, two players — what the dialog looks like on an ordinary night. */
export const ReviewHeader: Story = {
  args: { matches: two, value: two[0].matchId },
  render: (args) => <Header matches={args.matches} />,
};

/** Eleven matches, twelve players: both rows overflow and scroll independently. */
export const ReviewHeaderFullRoom: Story = {
  args: { matches: bigLobby, value: bigLobby[0].matchId },
  render: (args) => <Header matches={args.matches} />,
};
