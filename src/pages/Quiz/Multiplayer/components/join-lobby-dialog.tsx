import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/Auth";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { useMultiplayer } from "@/hooks/useMultiplayer";
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
  const connectionStatus = useConnectionStatus();
  const { checkSession } = useMultiplayer();
  const { data: user } = useUser();

  // Identity is the logged-in account, not a typed name.
  const username = user?.username ?? "";
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setIsChecking(false);
    }
  }, [open]);

  // Editing the code clears the previous rejection — otherwise the old "that code doesn't exist"
  // sits under a code the user has already corrected.
  const handleRoomCodeChange = (value: string) => {
    setRoomCode(value);
    if (error) setError(null);
  };

  const handleJoinLobby = async () => {
    // Joining requires login — invite links should prompt sign-in, not a typed username.
    if (!user) {
      onOpenChange(false);
      navigate("/login?redirectTo=/multiplayer-menu");
      return;
    }
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError("Room code is required");
      return;
    }

    // Verify the code before navigating. Without this the dialog closed unconditionally and a wrong
    // code left the player stranded on the lobby route in a failed state, staring at a second,
    // duplicate code form — the failure had nowhere to go but the lobby page's "not joined yet"
    // fallback. Rejecting here keeps the correction where the mistake was made.
    setIsChecking(true);
    setError(null);
    try {
      const availability = await checkSession(code);
      if (!availability.canJoin) {
        setError(availability.message ?? "Couldn't join that lobby.");
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't reach the server. Please try again."
      );
      return;
    } finally {
      setIsChecking(false);
    }

    // The lobby page still performs the actual join once its connection is live — this check is
    // advisory (the lobby can fill in between), and joining from here was the original cause of
    // "a typed code won't join but the invite link does". See docs/quiz/multiplayer-join.md.
    onOpenChange(false);
    navigate(`/multiplayer/lobby/${code}`);
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
      onRoomCodeChange={handleRoomCodeChange}
      error={error}
      isChecking={isChecking}
      connectionStatus={connectionStatus}
      onJoin={handleJoinLobby}
      onCancel={handleCancel}
    />
  );
};
