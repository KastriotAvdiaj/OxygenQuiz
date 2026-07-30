import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/dialog";
import { LiftedButton } from "@/common/LiftedButton";

export interface CreateLobbyDialogViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxPlayers: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isCreating: boolean;
  onCreate: () => void;
  onCancel: () => void;
}

/**
 * Presentational half of the "create lobby" dialog: the max-players stepper + dialog shell.
 * Split out of CreateLobbyDialog (which owns the account/session/navigation wiring) so it can
 * be previewed in Storybook with no backend — same pattern as MultiplayerGame / QuizInterface.
 */
export const CreateLobbyDialogView = ({
  open,
  onOpenChange,
  maxPlayers,
  onIncrement,
  onDecrement,
  isCreating,
  onCreate,
  onCancel,
}: CreateLobbyDialogViewProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-quiz bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center tracking-wider">
            Create Quiz Lobby
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 font-quiz">
          <div className="space-y-3">
            <label className="text-sm font-medium text-center block">Max Players</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onDecrement}
                disabled={maxPlayers <= 2 || isCreating}
                className="h-12 w-12 flex-shrink-0 rounded-full bg-primary text-white hover:bg-primary/80"
                aria-label="Decrease max players"
              >
                <span className="text-xl font-bold">−</span>
              </Button>
              <div className="flex-1 rounded-lg p-2 text-center flex items-center justify-center">
                <div className="bg-muted/50 w-fit px-4 py-2 rounded-md shadow-md">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-3xl font-bold font-mono text-primary">
                      {maxPlayers}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onIncrement}
                disabled={maxPlayers >= 10 || isCreating}
                className="h-12 w-12 flex-shrink-0 rounded-full bg-primary text-white hover:bg-primary/80"
                aria-label="Increase max players"
              >
                <span className="text-xl font-bold">+</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Choose between 2 and 10 players
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <LiftedButton
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            liftColor="#e5e7eb" // gray-200 — depth layers match the face
            className="w-full sm:w-auto text-foreground rounded-md bg-background border border-gray-200"
          >
            Cancel
          </LiftedButton>
          <LiftedButton
            type="button"
            onClick={onCreate}
            disabled={isCreating}
            className="w-full sm:w-auto font-quiz text-white"
          >
            {isCreating ? "Creating..." : "Create Lobby"}
          </LiftedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
