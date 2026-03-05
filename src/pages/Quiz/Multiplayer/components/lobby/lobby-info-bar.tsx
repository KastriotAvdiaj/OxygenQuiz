import { Button } from "@/components/ui/button";
import { Users, Copy, Check, LogOut } from "lucide-react";

interface LobbyInfoBarProps {
  participantCount: number;
  sessionId: string;
  copied: boolean;
  onCopyInvite: () => void;
  onLeave: () => void;
}

export const LobbyInfoBar = ({
  participantCount,
  sessionId,
  copied,
  onCopyInvite,
  onLeave,
}: LobbyInfoBarProps) => {
  return (
    <div className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-muted/30 rounded-lg border-2 border-dashed border-primary/10">
      {/* Left: player count + room code */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Users className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm sm:text-base font-bold font-header">
            {participantCount}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1 text-xs sm:text-sm font-mono">
          <span className="text-muted-foreground">Room:</span>
          <span className="font-bold text-primary">{sessionId}</span>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1.5">
        <Button
          onClick={onCopyInvite}
          variant="outline"
          size="sm"
          className="gap-1 border border-foreground/40 text-xs font-bold h-7 sm:h-8 px-2 sm:px-3"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              {/* <span className="hidden sm:inline">Copied</span> */}
              <span className="sm:hidden">✓</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
            </>
          )}
        </Button>

        <Button
          onClick={onLeave}
          variant="outline"
          size="sm"
          className="border border-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors text-destructive text-xs font-bold h-7 sm:h-8 px-2 sm:px-2"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
