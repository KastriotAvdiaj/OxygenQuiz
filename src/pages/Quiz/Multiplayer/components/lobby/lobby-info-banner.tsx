import { MessageSquare } from "lucide-react";
import type { Participant } from "../../hooks/use-lobby-connection";

interface LobbyInfoBannerProps {
  isHost: boolean;
  participants: Participant[];
}

export const LobbyInfoBanner = ({ isHost, participants }: LobbyInfoBannerProps) => {
  if (participants.length === 0) return null;

  const hostUsername = participants.find((p) => p.isHost)?.username || "Host";

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
