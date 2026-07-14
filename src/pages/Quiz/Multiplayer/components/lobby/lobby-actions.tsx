import { Button } from "@/components/ui/button";
import { Check, Play } from "lucide-react";
import type { Participant } from "../../hooks/use-lobby-connection";

interface LobbyActionsProps {
  isHost: boolean;
  isReady: boolean;
  canStartQuiz: boolean;
  allPlayersReady: boolean;
  participants: Participant[];
  hasSelectedQuiz: boolean;
  onToggleReady: () => void;
  onStartQuiz: () => void;
}

export const LobbyActions = ({
  isHost,
  isReady,
  canStartQuiz,
  allPlayersReady,
  participants,
  hasSelectedQuiz,
  onToggleReady,
  onStartQuiz,
}: LobbyActionsProps) => {
  // Why the game can't start yet — shown as text, not as a dead-looking button.
  const getBlockedReason = () => {
    if (!hasSelectedQuiz) return "Select a quiz to get started";
    if (participants.length < 2) return "Waiting for more players to join…";
    if (!allPlayersReady) {
      const notReady = participants.filter((p) => !p.isReady).length;
      return `Waiting for ${notReady} ${notReady === 1 ? "player" : "players"} to ready up…`;
    }
    return null;
  };

  const readyButton = (
    <Button
      onClick={onToggleReady}
      variant="outline"
      className={`flex-1 sm:flex-initial h-10 sm:h-11 px-6 text-sm sm:text-base font-bold font-quiz tracking-wider transition-colors ${
        isReady
          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
          : ""
      }`}
    >
      {isReady && <Check className="h-4 w-4" />}
      {isReady ? "READY" : "READY UP"}
    </Button>
  );

  if (!isHost) {
    return (
      <div className="flex items-stretch">
        <Button
          onClick={onToggleReady}
          variant={isReady ? "outline" : "default"}
          className={`flex-1 h-10 sm:h-11 text-sm sm:text-base font-bold font-quiz tracking-wider transition-colors ${
            isReady
              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
              : "text-white"
          }`}
        >
          {isReady && <Check className="h-4 w-4" />}
          {isReady ? "READY" : "READY UP"}
        </Button>
      </div>
    );
  }

  // `canStartQuiz` is the single source of truth for the gate; the derived
  // reason is only the human explanation (with a generic fallback).
  const blockedReason = !canStartQuiz
    ? getBlockedReason() ?? "Waiting to start…"
    : null;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
      {readyButton}

      {blockedReason ? (
        // Status, not a button — a disabled primary CTA reads as broken UI.
        <p className="flex flex-1 items-center justify-center sm:justify-start px-1 text-sm text-muted-foreground">
          {blockedReason}
        </p>
      ) : (
        <Button
          onClick={onStartQuiz}
          className="flex-1 h-10 sm:h-11 text-sm sm:text-base font-bold font-quiz tracking-wider text-white"
        >
          <Play className="h-4 w-4" />
          START GAME
        </Button>
      )}
    </div>
  );
};
