import { Button } from "@/components/ui/button";
import { Users, Copy, Check } from "lucide-react";

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
    <div className="flex flex-col gap-2.5 sm:gap-3 p-3 sm:p-4 md:p-5 bg-muted/30 rounded-lg sm:rounded-xl border-2 border-dashed border-primary/10 transition-all duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-background rounded-lg sm:rounded-xl border shadow-sm">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider font-quiz">
              Players
            </p>
            <p className="text-xl sm:text-2xl font-black font-header">
              {participantCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-background rounded-lg sm:rounded-xl border-2 border-primary/10 text-xs sm:text-sm font-mono shadow-sm">
          <span className="text-muted-foreground text-[10px] sm:text-xs">Room:</span>
          <span className="font-bold text-primary text-xs sm:text-sm">{sessionId}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onCopyInvite}
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 sm:gap-2 border-2 text-xs sm:text-sm font-bold h-8 sm:h-9"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
              <span className="hidden xs:inline">Copied</span>
              <span className="xs:hidden">✓</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Invite</span>
            </>
          )}
        </Button>

        <Button
          onClick={onLeave}
          variant="outline"
          size="sm"
          className="flex-1 border-2 border-destructive/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors text-xs sm:text-sm font-bold h-8 sm:h-9"
        >
          Leave
        </Button>
      </div>
    </div>
  );
};
