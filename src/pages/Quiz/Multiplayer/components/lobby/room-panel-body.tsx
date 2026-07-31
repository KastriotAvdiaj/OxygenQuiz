import { Check, Copy, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoomPanelBodyProps {
  sessionId: string;
  participantCount: number;
  maxPlayers: number;
  copied: boolean;
  onCopyInvite: () => void;
  onLeave: () => void;
}

/**
 * Body of the "Room" panel — the invite hub. The room code is the single most-shared thing on
 * this screen, so the whole block is one big copy target rather than a code plus a separate
 * copy button.
 */
export const RoomPanelBody = ({
  sessionId,
  participantCount,
  maxPlayers,
  copied,
  onCopyInvite,
  onLeave,
}: RoomPanelBodyProps) => (
  <div className="flex h-full flex-col gap-2.5">
    <button
      type="button"
      onClick={onCopyInvite}
      title="Copy invite link"
      className="group flex w-full flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-primary/15 lg:py-3"
    >
      {/* <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">
        Room code
      </span> */}
      <span className="flex items-center gap-2">
        <span className="font-mono text-lg font-extrabold tracking-[0.2em] text-primary lg:text-2xl">
          {sessionId}
        </span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary transition-transform group-active:scale-90 lg:h-6 lg:w-6">
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500 lg:h-3.5 lg:w-3.5" />
          ) : (
            <Copy className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
          )}
        </span>
      </span>
      <span className="text-[10px] text-muted-foreground lg:text-[11px]">
        {copied ? "Invite link copied" : "Click to copy invite link"}
      </span>
    </button>

    {/* One row: neither the count nor the Leave button needs the full width, and pairing them
        keeps the panel from turning into a stack of full-bleed bars. */}
    <div className="mt-auto flex items-center gap-2">
      {/* bg-muted in light mode — the panel body is --background there, so a translucent
          background tint would be invisible against it. */}
      <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-muted px-3 text-xs dark:bg-background/60 lg:h-10 lg:text-sm">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-semibold tabular-nums text-foreground">
          {participantCount}
        </span>
        {maxPlayers > 0 && (
          <span className="text-muted-foreground">/ {maxPlayers}</span>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="none"
        onClick={onLeave}
        className="h-9 flex-1 gap-1.5 rounded-md border-border text-xs text-muted-foreground hover:border-destructive hover:bg-destructive hover:text-white lg:h-10 lg:text-sm"
      >
        <LogOut className="h-3.5 w-3.5" />
        Leave lobby
      </Button>
    </div>
  </div>
);
