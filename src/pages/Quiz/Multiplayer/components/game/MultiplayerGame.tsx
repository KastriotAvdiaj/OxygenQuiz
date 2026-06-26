import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Check, X } from "lucide-react";
import type { useMatch, ScoreboardEntry } from "../../hooks/use-match";
import { MultiplayerQuestionView } from "./multiplayer-question-view";

interface MultiplayerGameProps {
  username: string;
  match: ReturnType<typeof useMatch>;
  onExit: () => void;
}

/**
 * Full-screen live match view. Driven entirely by server events surfaced through `useMatch`:
 * a countdown, then a question-per-round loop (answer → reveal), then the final results.
 *
 * The live-question phase reuses the singleplayer gameplay components via
 * <MultiplayerQuestionView> so both modes look the same; the countdown / reveal / results phases
 * are multiplayer-only and stay bespoke (see docs/known-issues.md).
 */
export const MultiplayerGame = ({ username, match, onExit }: MultiplayerGameProps) => {
  const { phase } = match;

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 font-header">
      <div className="w-full max-w-3xl mx-auto">
        {phase === "starting" && <CountdownPanel seconds={match.countdownSeconds} />}
        {phase === "question" && <MultiplayerQuestionView match={match} />}
        {phase === "reveal" && <RevealPanel username={username} match={match} />}
        {phase === "ended" && <ResultsPanel username={username} match={match} onExit={onExit} />}
      </div>
    </div>
  );
};

// ── Countdown before the first question ───────────────────────────────────────
const CountdownPanel = ({ seconds }: { seconds: number }) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  return (
    <Card variant="lifted" hover={false} className="bg-background">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Get ready</p>
        <div className="text-7xl font-extrabold font-quiz text-primary tabular-nums">
          {remaining > 0 ? remaining : "Go!"}
        </div>
      </CardContent>
    </Card>
  );
};

// ── Between-question reveal ───────────────────────────────────────────────────
const RevealPanel = ({ username, match }: { username: string; match: ReturnType<typeof useMatch> }) => {
  const me = match.lastResult?.players.find((p) => p.username === username);

  return (
    <Card variant="lifted" hover={false} className="bg-background">
      <CardContent className="p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          {me?.isCorrect ? (
            <span className="flex items-center gap-2 text-emerald-600 font-bold text-2xl">
              <Check className="h-7 w-7" /> Correct! +{me.pointsAwarded}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-red-500 font-bold text-2xl">
              <X className="h-7 w-7" /> {me?.answered ? "Incorrect" : "No answer"}
            </span>
          )}
        </div>

        <Scoreboard entries={match.scoreboard} username={username} />

        <p className="text-center text-xs text-muted-foreground">Next question soon…</p>
      </CardContent>
    </Card>
  );
};

// ── Final results ─────────────────────────────────────────────────────────────
const ResultsPanel = ({
  username,
  match,
  onExit,
}: {
  username: string;
  match: ReturnType<typeof useMatch>;
  onExit: () => void;
}) => {
  const winner = match.matchResult?.winnerUsername;
  const youWon = winner != null && winner === username;

  return (
    <Card variant="lifted" hover={false} className="bg-background">
      <CardContent className="p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 py-2">
          <Trophy className="h-12 w-12 text-yellow-500" />
          <h2 className="text-2xl font-extrabold font-quiz">
            {winner ? (youWon ? "You win!" : `${winner} wins!`) : "It's a tie!"}
          </h2>
        </div>

        <Scoreboard entries={match.scoreboard} username={username} showRank />

        <Button size="lg" className="w-full h-12 font-bold" onClick={onExit}>
          Back to lobby
        </Button>
      </CardContent>
    </Card>
  );
};

// ── Shared scoreboard ─────────────────────────────────────────────────────────
const Scoreboard = ({
  entries,
  username,
  showRank = false,
}: {
  entries: ScoreboardEntry[];
  username: string;
  showRank?: boolean;
}) => (
  <div className="flex flex-col gap-2">
    {entries.map((e, i) => (
      <div
        key={e.username}
        className={`flex items-center justify-between rounded-md px-4 py-2.5 ${
          e.username === username ? "bg-primary/10 border border-primary/30" : "bg-muted"
        }`}
      >
        <span className="flex items-center gap-3 font-semibold">
          {showRank && <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>}
          {e.username}
          {e.username === username && <span className="text-xs text-primary">(you)</span>}
        </span>
        <span className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{e.correct} correct</span>
          <span className="font-bold tabular-nums w-14 text-right">{e.score}</span>
        </span>
      </div>
    ))}
  </div>
);
