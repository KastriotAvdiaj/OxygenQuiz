import { Info, Gamepad2 } from "lucide-react";
import type { Participant } from "../../hooks/use-lobby-connection";

interface LobbyInfoBannerProps {
  isHost: boolean;
  participants: Participant[];
  hasSelectedQuiz: boolean;
}

/**
 * One quiet line of context under the actions — not a boxed banner.
 * Amber icon while a quiz still needs picking, neutral otherwise.
 */
export const LobbyInfoBanner = ({
  isHost,
  participants,
  hasSelectedQuiz,
}: LobbyInfoBannerProps) => {
  if (participants.length === 0) return null;

  const hostUsername = participants.find((p) => p.isHost)?.username || "Host";

  if (!hasSelectedQuiz) {
    return (
      <p className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-header">
        <Gamepad2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        {isHost
          ? "Pick a quiz in the Quiz panel to get started."
          : `Waiting for ${hostUsername} to pick a quiz.`}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-header">
      <Info className="h-3.5 w-3.5 shrink-0 text-primary/70" />
      {isHost
        ? "You're the host — start the game when everyone's ready."
        : `${hostUsername} will start the game when everyone's ready.`}
    </p>
  );
};
