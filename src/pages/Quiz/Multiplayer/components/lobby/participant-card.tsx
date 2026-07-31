import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    <div className="flex w-[4.5rem] flex-col items-center gap-1 lg:w-[5.5rem]">
      <div className="relative">
        <Avatar
          className={`h-10 w-10 ring-2 ring-offset-2 ring-offset-background transition-colors lg:h-14 lg:w-14 ${
            participant.isReady ? "ring-emerald-500" : "ring-transparent"
          }`}
        >
          <AvatarImage
            src={participant.profileImageUrl ?? undefined}
            alt={`${participant.username}'s avatar`}
          />
          <AvatarFallback className={`${avatarColor} text-white font-bold`}>
            {participant.username ? participant.username.charAt(0).toUpperCase() : "?"}
          </AvatarFallback>
        </Avatar>

        {participant.isHost && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary shadow-sm">
                <Crown className="h-2.5 w-2.5 text-white" fill="currentColor" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Host</TooltipContent>
          </Tooltip>
        )}

        {participant.isReady && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-emerald-500">
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="flex w-full flex-col items-center">
        <p className="w-full truncate text-center text-[11px] font-semibold lg:text-sm">
          {participant.username}
        </p>
        {isCurrentUser && (
          <Badge variant="secondary" className="mt-0.5 h-4 px-1.5 text-[9px] font-bold">
            YOU
          </Badge>
        )}
      </div>
    </div>
  );
};
