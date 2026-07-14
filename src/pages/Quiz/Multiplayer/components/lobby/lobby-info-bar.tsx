import { Users, Copy, Check, LogOut } from "lucide-react";

interface LobbyInfoBarProps {
  participantCount: number;
  sessionId: string;
  copied: boolean;
  onCopyInvite: () => void;
  onLeave: () => void;
}

/**
 * Quiet status row: player count, click-to-copy room code, leave action.
 * Deliberately unboxed — the participant grid below is the visual anchor.
 */
export const LobbyInfoBar = ({
  participantCount,
  sessionId,
  copied,
  onCopyInvite,
  onLeave,
}: LobbyInfoBarProps) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-semibold text-foreground tabular-nums">
            {participantCount}
          </span>
        </span>

        <span className="h-4 w-px bg-border" />

        {/* Room code doubles as the copy-invite button */}
        <button
          type="button"
          onClick={onCopyInvite}
          title="Copy invite link"
          className="group flex items-center gap-1.5 rounded-md px-2 py-1 -ml-1 font-mono text-sm transition-colors hover:bg-muted"
        >
          <span className="text-muted-foreground">Room</span>
          <span className="font-bold tracking-widest text-primary">
            {sessionId}
          </span>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-100" />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-3.5 w-3.5" />
        Leave
      </button>
    </div>
  );
};
