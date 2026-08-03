import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface LeaveLobbyDialogProps {
  isOpen: boolean;
  isHost: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * True when a match is in progress. Changes the copy only — the blocker and its
   * proceed/reset are the same either way. Worth distinguishing because "you can rejoin later
   * with the room code" is actively misleading mid-match: the round clock keeps running on the
   * server while you're away, so leaving costs points rather than nothing.
   */
  inMatch?: boolean;
}

export const LeaveLobbyDialog = ({
  isOpen,
  isHost,
  onConfirm,
  onCancel,
  inMatch = false,
}: LeaveLobbyDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent
        className="sm:max-w-md border-[3px] border-foreground p-0 overflow-hidden"
        // Prevent dismissal via overlay click or Escape key
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-4 sm:p-6 space-y-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              {/* <div className="flex-shrink-0 p-2.5 rounded-full bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div> */}
              <DialogTitle className="text-xl font-bold font-quiz tracking-wider text-foreground">
                {inMatch ? "Leave the match?" : "Leave Lobby?"}
              </DialogTitle>
            </div>

            <DialogDescription className="text-sm text-muted-foreground leading-relaxed font-quiz">
              {inMatch
                ? isHost
                  ? "The match is still running. Leaving now forfeits your remaining questions, and as host it will end the match for everyone."
                  : "The match is still running. The clock keeps going without you, so any questions left will be scored as unanswered."
                : isHost
                  ? "You are the host. Leaving will disband the lobby and disconnect all participants."
                  : "You will be removed from the lobby. You can rejoin later with the room code."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row gap-2 sm:gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 h-10 sm:h-11 font-bold font-quiz tracking-wider border-2 hover:bg-background/40"
            >
              Stay
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="flex-1 h-10 sm:h-11 font-bold font-quiz tracking-wider shadow-lg"
            >
              {inMatch ? "Leave Match" : "Leave Lobby"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
