import { Input } from "@/components/ui/form";
import { WifiOff, ServerOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/dialog";
import { LiftedButton } from "@/common/LiftedButton";
import type { ConnectionStatus } from "@/hooks/use-connection-status";

export interface JoinLobbyDialogViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  error: string | null;
  /** True while the room code is being verified against the server, before navigating. */
  isChecking?: boolean;
  connectionStatus: ConnectionStatus;
  onJoin: () => void;
  onCancel: () => void;
}

/**
 * Presentational half of the "join lobby" dialog: room code entry + connection warning + dialog
 * shell. Split out of JoinLobbyDialog (which owns the account/URL/connection-status wiring —
 * including a real network ping via useConnectionStatus) so it can be previewed in Storybook with
 * no backend — same pattern as MultiplayerGame / QuizInterface.
 */
export const JoinLobbyDialogView = ({
  open,
  onOpenChange,
  username,
  roomCode,
  onRoomCodeChange,
  error,
  isChecking = false,
  connectionStatus,
  onJoin,
  onCancel,
}: JoinLobbyDialogViewProps) => {
  const canJoin = connectionStatus.status === "connected" && !isChecking;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-quiz bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center tracking-wider">
            Join Quiz Lobby
          </DialogTitle>
          {/* <DialogDescription className="text-center">
            Enter the room code to join
          </DialogDescription> */}
        </DialogHeader>

        <div className="py-4 space-y-4 font-quiz">
          {connectionStatus.status !== "connected" && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-2.5">
              {connectionStatus.status === "no-internet" ? (
                <WifiOff className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ServerOff className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{connectionStatus.message}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Enter the room code to join
            </label>
            <Input
              type="text"
              variant="minimal"
              placeholder="XXXXXX"
              value={roomCode}
              onChange={(e) => onRoomCodeChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canJoin && roomCode.trim()) onJoin();
              }}
              disabled={isChecking}
              className="h-16 border-2 border-primary/30 text-center text-2xl font-extrabold tracking-[0.3em] uppercase transition-all focus-visible:border-primary"
              maxLength={6}
            />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            Joining as{" "}
            <span className="font-bold text-foreground">{username || "…"}</span>
          </div>

          {error && (
            <div className="bg-destructive/20 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <LiftedButton
            type="button"
            onClick={onCancel}
            liftColor="#e5e7eb" // gray-200 — depth layers match the face
            className="w-full sm:w-auto text-foreground rounded-md bg-background border border-gray-200"
          >
            Cancel
          </LiftedButton>
          <LiftedButton
            type="button"
            onClick={onJoin}
            disabled={!canJoin || !roomCode.trim()}
            isPending={isChecking}
            className="w-full sm:w-auto font-bold font-quiz text-white rounded-md"
          >
            {isChecking ? "Checking…" : "Join Lobby"}
          </LiftedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
