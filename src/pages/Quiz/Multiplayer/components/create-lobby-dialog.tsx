import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useUser } from "@/lib/Auth";
import { useNotifications } from "@/common/Notifications";
import { CreateLobbyDialogView } from "./create-lobby-dialog-view";

interface CreateLobbyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generates a random room code — plain function is enough (no state), unlike the
// stepper below which needs to re-render as the player adjusts it.
const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export const CreateLobbyDialog = ({ open, onOpenChange }: CreateLobbyDialogProps) => {
  const navigate = useNavigate();
  const { createSession } = useMultiplayer();
  const { addNotification } = useNotifications();
  const { data: user } = useUser();

  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateLobby = async () => {
    // Hosting requires login — identity is the account, never a random/typed name.
    if (!user) {
      onOpenChange(false);
      navigate("/login?redirectTo=/multiplayer-menu");
      return;
    }

    setIsCreating(true);

    try {
      const sessionId = generateRoomCode();
      const username = user.username;
      const lobbyName = `${username}'s Quiz Lobby`;

      await createSession(sessionId, lobbyName, maxPlayers);

      sessionStorage.setItem("quiz_session", JSON.stringify({ sessionId, username }));

      addNotification({
        type: "success",
        title: "Lobby created successfully!",
      });

      onOpenChange(false);
      navigate(`/multiplayer/lobby/${sessionId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create lobby";

      addNotification({
        type: "error",
        title: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setMaxPlayers(4);
  };

  return (
    <CreateLobbyDialogView
      open={open}
      onOpenChange={onOpenChange}
      maxPlayers={maxPlayers}
      onIncrement={() => setMaxPlayers((prev) => Math.min(10, prev + 1))}
      onDecrement={() => setMaxPlayers((prev) => Math.max(2, prev - 1))}
      isCreating={isCreating}
      onCreate={handleCreateLobby}
      onCancel={handleCancel}
    />
  );
};
