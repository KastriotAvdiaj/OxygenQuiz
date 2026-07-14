import { Badge } from "@/components/ui/badge";
import { Crown, Check } from "lucide-react";
import type { Participant } from "../../hooks/use-lobby-connection";

interface ParticipantCardProps {
  participant: Participant;
  isCurrentUser: boolean;
  avatarColor: string;
}

export const ParticipantCard = ({
  participant,
  isCurrentUser,
  avatarColor,
}: ParticipantCardProps) => {
  return (
    <div
      className={`group relative flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl border-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        participant.isReady
          ? "border-emerald-500 bg-emerald-500/5"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {/* Host Crown */}
      {participant.isHost && (
        <div className="absolute -top-2 sm:-top-2.5 -right-2 sm:-right-2.5 rotate-12">
          <div className="p-1 sm:p-1.5 bg-amber-500 rounded-md sm:rounded-lg border-2 border-background shadow-lg">
            <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </div>
        </div>
      )}

      {/* Avatar — real profile image when the account has one, colored initial otherwise */}
      {participant.profileImageUrl ? (
        <img
          src={participant.profileImageUrl}
          alt={`${participant.username}'s avatar`}
          className="w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-lg sm:rounded-xl object-cover shadow-inner border-2 border-white/20 flex-shrink-0"
          onError={(e) => {
            // Broken/expired image URL → hide it and reveal the initial fallback
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div
        className={`${
          participant.profileImageUrl ? "hidden" : ""
        } w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-lg sm:rounded-xl ${avatarColor} flex items-center justify-center text-white font-bold text-sm sm:text-lg md:text-xl shadow-inner border-2 border-white/20 flex-shrink-0`}
      >
        {participant.username ? participant.username.charAt(0).toUpperCase() : "?"}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <p className="font-bold truncate font-header text-xs sm:text-sm md:text-base lg:text-lg">
            {participant.username}
          </p>
          {isCurrentUser && (
            <Badge
              variant="secondary"
              className="text-[8px] sm:text-[10px] h-4 sm:h-5 px-1 sm:px-1.5 font-bold flex-shrink-0"
            >
              YOU
            </Badge>
          )}
        </div>
        <p
          className={`text-[10px] sm:text-xs md:text-sm font-bold mt-0.5 ${
            participant.isReady
              ? "text-emerald-600 flex items-center gap-1"
              : "text-muted-foreground"
          }`}
        >
          {participant.isReady ? (
            <>
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              READY
            </>
          ) : (
            "NOT READY"
          )}
        </p>
      </div>
    </div>
  );
};
