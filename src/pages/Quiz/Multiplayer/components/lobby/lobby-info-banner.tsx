import { MessageSquare, Gamepad2 } from "lucide-react";
import type { Participant } from "../../hooks/use-lobby-connection";

interface LobbyInfoBannerProps {
  isHost: boolean;
  participants: Participant[];
  hasSelectedQuiz: boolean;
}

export const LobbyInfoBanner = ({
  isHost,
  participants,
  hasSelectedQuiz,
}: LobbyInfoBannerProps) => {
  if (participants.length === 0) return null;

  const hostUsername = participants.find((p) => p.isHost)?.username || "Host";

  // Show quiz selection prompt when no quiz is selected
  if (!hasSelectedQuiz) {
    return (
      <div className="rounded-lg sm:rounded-xl bg-amber-500/10 p-2 sm:p-3 border border-amber-500/20">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1 sm:p-1.5 bg-background rounded-full shadow-sm flex-shrink-0">
            <Gamepad2 className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
          </div>
          <div className="flex-1 text-xs sm:text-sm font-header">
            <p className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
              {isHost ? "Select a quiz to play" : `Waiting for ${hostUsername} to select a quiz`}
            </p>
            <p className="text-muted-foreground text-[10px] sm:text-xs">
              {isHost
                ? "Browse and pick a public quiz from the list above"
                : "The host will choose a quiz for this session"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg sm:rounded-xl bg-primary/5 p-2 sm:p-3 border border-primary/10">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1 sm:p-1.5 bg-background rounded-full shadow-sm flex-shrink-0">
          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
        </div>
        <div className="flex-1 text-xs sm:text-sm font-header">
          <p className="font-bold text-xs sm:text-sm">
            {isHost ? "You are the host" : `${hostUsername} is the host`}
          </p>
          <p className="text-muted-foreground text-[10px] sm:text-xs">
            {isHost
              ? "Start when all players are ready"
              : "Host will start when ready"}
          </p>
        </div>
      </div>
    </div>
  );
};
