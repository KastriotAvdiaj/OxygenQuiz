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
    <div className="rounded-lg sm:rounded-xl bg-primary/5 p-2.5 sm:p-4 border border-primary/10">
      <div className="flex items-start sm:items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-background rounded-full shadow-sm flex-shrink-0">
          <MessageSquare className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div className="flex-1 text-xs sm:text-sm font-header">
          <p className="font-bold text-xs sm:text-base mb-0.5">
            {isHost ? "You are the host" : `${hostUsername} is the host`}
          </p>
          <p className="text-muted-foreground text-[10px] sm:text-sm">
            {isHost
              ? "Start when all players are ready"
              : "Host will start when ready"}
          </p>
        </div>
      </div>
    </div>
  );
};
