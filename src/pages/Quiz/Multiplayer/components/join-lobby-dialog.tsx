import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/lib/Auth";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { JoinLobbyDialogView } from "./join-lobby-dialog-view";

interface JoinLobbyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinLobbyDialog = ({
  open,
  onOpenChange,
}: JoinLobbyDialogProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const connectionStatus = useConnectionStatus();
  const { data: user } = useUser();

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
    // does" — the lobby now owns the single, connection-safe join. See docs/quiz/multiplayer-join.md.
    onOpenChange(false);
    navigate(`/multiplayer/lobby/${roomCode.toUpperCase()}`);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setRoomCode("");
    setError(null);
  };

  return (
    <JoinLobbyDialogView
      open={open}
      onOpenChange={onOpenChange}
      username={username}
      roomCode={roomCode}
      onRoomCodeChange={setRoomCode}
      error={error}
      connectionStatus={connectionStatus}
      onJoin={handleJoinLobby}
      onCancel={handleCancel}
    />
  );
};
