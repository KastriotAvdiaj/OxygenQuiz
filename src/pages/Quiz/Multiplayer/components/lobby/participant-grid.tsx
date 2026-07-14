import { Users } from "lucide-react";
import { ParticipantCard } from "./participant-card";
import type { Participant } from "../../hooks/use-lobby-connection";
import { getAvatarColor } from "../../utils/avatar-colors";

interface ParticipantGridProps {
  participants: Participant[];
  currentUsername: string;
}

export const ParticipantGrid = ({
  participants,
  currentUsername,
}: ParticipantGridProps) => {
  return (
    // Soft inset surface — no border, no pattern; the participant cards
    // themselves provide the visual detail.
    <div className="rounded-xl bg-muted/40 p-2.5 sm:p-3 md:p-4 transition-all duration-300">
      {participants.length === 0 ? (
        <div className="h-full min-h-[100px] sm:min-h-[120px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Users className="w-8 h-8 sm:w-10 sm:h-10 opacity-40" />
          <div className="text-center font-header px-4">
            <p className="text-sm sm:text-base font-semibold">
              Waiting for players...
            </p>
            <p className="text-xs sm:text-sm mt-0.5 opacity-70">
              Share the room code to get started
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {participants.map((participant, index) => (
            <ParticipantCard
              key={index}
              participant={participant}
              isCurrentUser={participant.username === currentUsername}
              avatarColor={getAvatarColor(participant.username)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
