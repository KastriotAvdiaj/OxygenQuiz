import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Crown, Check, X } from "lucide-react";
import type { useMatch, ScoreboardEntry } from "../../hooks/use-match";
import type { Participant } from "../../hooks/use-lobby-connection";
import { MultiplayerQuestionView } from "./multiplayer-question-view";
import {
  FloatingAvatarCluster,
  AvatarCircle,
  type AvatarClusterPlayer,
  type AvatarState,
} from "./floating-avatar-cluster";

interface MultiplayerGameProps {
  username: string;
  match: ReturnType<typeof useMatch>;
  onExit: () => void;
  participants: Participant[];
}

/**
 * Full-screen live match view. Driven entirely by server events surfaced through `useMatch`:
 * a countdown, then a question-per-round loop (answer → reveal), then the final results.
 *
 * The live-question phase reuses the singleplayer gameplay components via
 * <MultiplayerQuestionView> so both modes look the same; the countdown / reveal / results phases
 * are multiplayer-only and stay bespoke (see docs/deployment/known-issues.md).
 */
export const MultiplayerGame = ({
  username,
  match,
  onExit,
  participants,
}: MultiplayerGameProps) => {
  const { phase } = match;

  // Falls back to the scoreboard's usernames (available in every phase) when the lobby roster is
  // empty — keeps the avatar cluster meaningful even before participants have propagated, and
  // keeps Storybook's hand-rolled `match` fixtures working without needing their own roster.
  const roster: Participant[] =
    participants.length > 0
      ? participants
      : match.scoreboard.map((s) => ({
          username: s.username,
          isHost: false,
          isReady: true,
          profileImageUrl: null,
        }));

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 font-header">
      <div className="w-full max-w-3xl mx-auto">
        {phase === "starting" && (
          <CountdownPanel
            seconds={match.countdownSeconds}
            username={username}
            participants={roster}
          />
        )}
        {phase === "question" && (
          <MultiplayerQuestionView
            match={match}
            username={username}
            participants={roster}
          />
        )}
        {phase === "reveal" && (
          <RevealPanel
            username={username}
            match={match}
            participants={roster}
          />
        )}
        {phase === "ended" && (
          <ResultsPanel
            username={username}
            match={match}
            onExit={onExit}
            participants={roster}
          />
        )}
      </div>
    </div>
  );
};

// ── Countdown before the first question ───────────────────────────────────────
const CountdownPanel = ({
  seconds,
  username,
  participants,
}: {
  seconds: number;
  username: string;
  participants: Participant[];
}) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const id = setInterval(
      () => setRemaining((r) => (r > 0 ? r - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [seconds]);

  const isGo = remaining <= 0;

  const players: AvatarClusterPlayer[] = participants.map((p) => ({
    username: p.username,
    profileImageUrl: p.profileImageUrl,
    isCurrentUser: p.username === username,
    state: "idle",
  }));

  return (
    <Card
      variant="lifted"
      hover={false}
      className="bg-background overflow-hidden border-0"
    >
      <CardContent className="relative flex flex-col items-center justify-center gap-6 py-16 sm:py-20">
        <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {isGo ? "Match starting" : "Get ready"}
        </p>

        <div className="relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={isGo ? "go" : remaining}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`font-quiz text-8xl font-extrabold tabular-nums sm:text-9xl ${
                isGo ? "text-emerald-500" : "text-primary"
              }`}
            >
              {isGo ? "GO" : remaining}
            </motion.span>
          </AnimatePresence>
        </div>

        <FloatingAvatarCluster
          players={players}
          size="lg"
          showNames
          float={false}
        />
      </CardContent>
    </Card>
  );
};

// ── Between-question reveal ───────────────────────────────────────────────────
const RevealPanel = ({
  username,
  match,
  participants,
}: {
  username: string;
  match: ReturnType<typeof useMatch>;
  participants: Participant[];
}) => {
  const me = match.lastResult?.players.find((p) => p.username === username);
  const isCorrect = !!me?.isCorrect;
  const noAnswer = !me?.answered;

  const players: AvatarClusterPlayer[] = participants.map((p) => {
    const result = match.lastResult?.players.find(
      (r) => r.username === p.username,
    );
    const state: AvatarState = !result
      ? "idle"
      : !result.answered
        ? "noAnswer"
        : result.isCorrect
          ? "correct"
          : "incorrect";
    return {
      username: p.username,
      profileImageUrl: p.profileImageUrl,
      isCurrentUser: p.username === username,
      state,
    };
  });

  return (
    <Card
      variant="lifted"
      hover={false}
      className="bg-background overflow-hidden border-0"
    >
      <CardContent className="relative flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4">
          <FloatingAvatarCluster players={players} size="lg" />

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className={`flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ${
              isCorrect
                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_24px_rgba(16,185,129,0.45)]"
                : "bg-gradient-to-br from-red-400 to-red-600 shadow-[0_0_24px_rgba(239,68,68,0.4)]"
            }`}
          >
            {isCorrect ? (
              <Check
                className="h-8 w-8 text-white sm:h-10 sm:w-10"
                strokeWidth={3}
              />
            ) : (
              <X
                className="h-8 w-8 text-white sm:h-10 sm:w-10"
                strokeWidth={3}
              />
            )}
          </motion.div>

          <div className="flex flex-col items-center gap-1">
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-quiz text-xl font-extrabold sm:text-2xl"
            >
              {isCorrect ? "Correct!" : noAnswer ? "No answer" : "Incorrect"}
            </motion.span>
            {isCorrect && me && (
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400"
              >
                +{me.pointsAwarded} points
              </motion.span>
            )}
          </div>
        </div>

        <Scoreboard entries={match.scoreboard} username={username} />

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          Next question soon…
        </div>
      </CardContent>
    </Card>
  );
};

// ── Final results ─────────────────────────────────────────────────────────────
const ResultsPanel = ({
  username,
  match,
  onExit,
  participants,
}: {
  username: string;
  match: ReturnType<typeof useMatch>;
  onExit: () => void;
  participants: Participant[];
}) => {
  const winner = match.matchResult?.winnerUsername;
  const youWon = winner != null && winner === username;
  const winnerParticipant = winner
    ? participants.find((p) => p.username === winner)
    : undefined;

  return (
    <Card variant="lifted" hover={false} className="bg-background border-0">
      <CardContent className="p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 py-2">
          {winner ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="relative"
            >
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 -rotate-12">
                <Crown
                  className="h-7 w-7 text-yellow-500 drop-shadow"
                  fill="currentColor"
                />
              </div>
              <div className="h-20 w-20 rounded-full border-4 border-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.4)] sm:h-24 sm:w-24">
                <AvatarCircle
                  username={winner}
                  profileImageUrl={winnerParticipant?.profileImageUrl}
                  className="h-full w-full"
                  textClassName="text-2xl sm:text-3xl"
                />
              </div>
            </motion.div>
          ) : (
            <Trophy className="h-12 w-12 text-yellow-500" />
          )}
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
    {entries.map((e, i) => {
      const isMe = e.username === username;
      return (
        <motion.div
          key={e.username}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.25, ease: "easeOut" }}
          className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
            isMe
              ? "bg-primary/10 border-primary/40 border-l-4 border-l-primary shadow-sm"
              : "bg-muted/60 border-transparent"
          }`}
        >
          <span className="flex items-center gap-3">
            {showRank &&
              (i === 0 ? (
                <Trophy className="h-4 w-4 text-yellow-500" />
              ) : (
                <span className="w-4 text-center text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
              ))}
            <span
              className={isMe ? "font-extrabold text-primary" : "font-semibold"}
            >
              {e.username}
            </span>
            {isMe && (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[9px] font-bold"
              >
                YOU
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{e.correct} correct</span>
            <span
              className={`w-14 text-right tabular-nums ${isMe ? "font-extrabold text-primary" : "font-bold"}`}
            >
              {e.score}
            </span>
          </span>
        </motion.div>
      );
    })}
  </div>
);
