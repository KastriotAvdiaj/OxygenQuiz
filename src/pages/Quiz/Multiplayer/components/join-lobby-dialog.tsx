import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { WifiOff, ServerOff } from "lucide-react";
import { useNotifications } from "@/common/Notifications";
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
  const { joinSession } = useMultiplayer();
  const connectionStatus = useConnectionStatus();
  const { addNotification } = useNotifications();

  const canJoin = connectionStatus.status === "connected";

  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
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
      setIsJoining(false);
    }
  }, [open]);

  const handleJoinLobby = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (!roomCode.trim()) {
      setError("Room code is required");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await joinSession(roomCode.toUpperCase(), username.trim());

      // Store session info
      sessionStorage.setItem("quiz_session", JSON.stringify({
        sessionId: roomCode.toUpperCase(),
        username: username.trim()
      }));

      addNotification({
        type: "success",
        title: "Successfully joined lobby!"
      });

      // Close dialog and navigate to lobby
      onOpenChange(false);
      navigate(`/multiplayer/lobby/${roomCode.toUpperCase()}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to join lobby";
      setError(errorMessage);

      addNotification({
        type: "error",
        title: "Failed to join lobby",
        message: "Please check the room code and try again",
        variant: "top-center",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setUsername("");
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
            Enter the room code and your username to join
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

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Username *</label>
            <Input
              type="text"
              variant="quiz"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 text-base"
              maxLength={20}
            />
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
            disabled={isJoining}
            className="w-full sm:w-auto text-foreground rounded-md py-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleJoinLobby}
            disabled={!canJoin || !username.trim() || !roomCode.trim() || isJoining}
            className="w-full sm:w-auto font-bold font-quiz text-white rounded-md"
          >
            {isJoining ? "Joining..." : "Join Lobby"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
