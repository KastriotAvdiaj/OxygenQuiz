import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface LeaveLobbyDialogProps {
  isOpen: boolean;
  isHost: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LeaveLobbyDialog = ({
  isOpen,
  isHost,
  onConfirm,
  onCancel,
}: LeaveLobbyDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent
        className="sm:max-w-md border-[3px] border-foreground p-0 overflow-hidden"
        // Prevent dismissal via overlay click or Escape key
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Destructive gradient header bar — matches quiz-selection-dialog pattern */}
        <div className="h-2 w-full bg-gradient-to-r from-destructive via-destructive/30 to-destructive/30" />

        <div className="p-4 sm:p-6 space-y-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2.5 rounded-full bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle className="text-xl font-bold font-quiz tracking-wider text-foreground">
                Leave Lobby?
              </DialogTitle>
            </div>

            <DialogDescription className="text-sm text-muted-foreground leading-relaxed font-quiz">
              {isHost
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
              Leave Lobby
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
