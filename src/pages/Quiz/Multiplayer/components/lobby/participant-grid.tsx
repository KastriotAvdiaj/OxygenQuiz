import { Users } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParticipantCard } from "./participant-card";
import type { Participant } from "../../hooks/use-lobby-connection";
import { getAvatarColor } from "../../utils/avatar-colors";

interface ParticipantGridProps {
  participants: Participant[];
  currentUsername: string;
  /** Lobby's configured player limit. 0/undefined = not known yet — no empty slots shown. */
  maxPlayers?: number;
}

const EmptySlot = () => (
  <div className="h-10 w-10 rounded-full border-2 border-dashed border-primary/20 lg:h-14 lg:w-14" />
);

export const ParticipantGrid = ({
  participants,
  currentUsername,
  maxPlayers = 0,
}: ParticipantGridProps) => {
  const emptySlots = Math.max(0, maxPlayers - participants.length);

  return (
    // No surface of its own — the enclosing <LobbyPanel> body already provides the inset
    // background, and stacking a second tint on top of it just muddies the colour.
    //
    // Centred wrap rather than a fixed column grid: a half-full lobby should sit in the middle
    // of the panel on both axes, not hug the top-left corner of a 6-column grid.
    <div className="flex h-full flex-wrap content-center items-center justify-center gap-2.5 lg:gap-4">
      {participants.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 text-center font-header text-muted-foreground">
          <Users className="h-7 w-7 opacity-40 lg:h-9 lg:w-9" />
          <div>
            <p className="text-xs font-semibold lg:text-base">
              Waiting for players...
            </p>
            <p className="mt-0.5 text-[11px] opacity-70 lg:text-sm">
              Share the room code to get started
            </p>
          </div>
        </div>
      ) : (
        <TooltipProvider>
          {participants.map((participant) => (
            <ParticipantCard
              key={participant.username}
              participant={participant}
              isCurrentUser={participant.username === currentUsername}
              avatarColor={getAvatarColor(participant.username)}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <EmptySlot key={`empty-${index}`} />
          ))}
        </TooltipProvider>
      )}
    </div>
  );
};
