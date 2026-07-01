import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/lib/Auth";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { Button } from "@/components/ui/button";
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

interface JoinLobbyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinLobbyDialog = ({ open, onOpenChange }: JoinLobbyDialogProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const connectionStatus = useConnectionStatus();
  const { data: user } = useUser();

  const canJoin = connectionStatus.status === "connected";

  // Identity is the logged-in account, not a typed name.
  const username = user?.username ?? "";
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Pre-fill room code from URL if present
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const handleJoinLobby = () => {
    // Joining requires login — invite links should prompt sign-in, not a typed username.
    if (!user) {
      onOpenChange(false);
      navigate("/login?redirectTo=/multiplayer-menu");
      return;
    }
    if (!roomCode.trim()) {
      setError("Room code is required");
      return;
    }

    // Navigate to the lobby with the code in the URL and let the lobby page perform the actual
    // join once its connection is live. Joining here (before navigation, possibly before the
    // SignalR connection is ready) was the cause of "a typed code won't join but the invite link
    // does" — the lobby now owns the single, connection-safe join. See docs/multiplayer-join.md.
    onOpenChange(false);
    navigate(`/multiplayer/lobby/${roomCode.toUpperCase()}`);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setRoomCode("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-quiz bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center tracking-wider">
            Join Quiz Lobby
          </DialogTitle>
          <DialogDescription className="text-center">
            Enter the room code to join
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 font-quiz">
          {/* Connection Warning — only shown when something is wrong */}
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

          {/* Room Code Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Room Code *</label>
            <Input
              type="text"
              variant="quiz"
              placeholder="Enter 6-character code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="h-12 text-xl tracking-widest text-center uppercase"
              maxLength={6}
            />
          </div>

          {/* Identity — the logged-in account, not free-typed */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Joining as</label>
            <div className="flex h-12 items-center rounded-md border-2 border-primary/20 bg-muted/40 px-3 text-base font-bold font-quiz">
              {username || "…"}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/20 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            onClick={handleCancel}
            variant="outline"
            className="w-full sm:w-auto text-foreground rounded-md py-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleJoinLobby}
            disabled={!canJoin || !roomCode.trim()}
            className="w-full sm:w-auto font-bold font-quiz text-white rounded-md"
          >
            Join Lobby
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
