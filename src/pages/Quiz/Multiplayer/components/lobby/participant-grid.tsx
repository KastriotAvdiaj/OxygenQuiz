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
    <div className="rounded-lg sm:rounded-xl border-2 border-primary/20 p-2.5 sm:p-3 md:p-4 bg-background/50 relative overflow-hidden transition-all duration-300">
      {/* Dot pattern background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />

      {participants.length === 0 ? (
        <div className="h-full min-h-[100px] sm:min-h-[120px] flex flex-col items-center justify-center text-muted-foreground space-y-2 relative z-10">
          <div className="p-2.5 sm:p-3 md:p-4 rounded-full bg-muted/50">
            <Users className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 opacity-50" />
          </div>
          <div className="text-center font-header px-4">
            <p className="text-sm sm:text-base md:text-xl font-bold">
              Waiting for players...
            </p>
            <p className="text-xs sm:text-sm mt-0.5 sm:mt-1 opacity-70">
              Share the invite link to get started
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 relative z-10">
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
