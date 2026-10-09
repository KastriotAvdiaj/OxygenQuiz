import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useUser } from "@/lib/Auth";
import { useNotifications } from "@/common/Notifications";
import {
  cheapestUpgrade,
  FREE_LOBBY_PLAYERS,
  MIN_LOBBY_PLAYERS,
  useMyPlan,
  usePlanCatalog,
} from "@/lib/api/plans";
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

  // The range is the host's plan's (docs/auth/paid-plans.md). Fast feedback only:
  // QuizHub.CreateSession clamps to the same plan limit server-side.
  const myPlan = useMyPlan(!!user);
  const catalog = usePlanCatalog();
  const planMax = myPlan.data?.limits.maxLobbyPlayers ?? FREE_LOBBY_PLAYERS;
  const upgrade = myPlan.data
    ? cheapestUpgrade(catalog.data, myPlan.data.plan, (l) => l.maxLobbyPlayers)
    : null;
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
      planMaxPlayers={planMax}
      upgradeHint={
        upgrade && !myPlan.data?.isStaff
          ? `Up to ${upgrade.limits.maxLobbyPlayers} players with ${upgrade.name}`
          : null
      }
      onIncrement={() => setMaxPlayers((prev) => Math.min(planMax, prev + 1))}
      onDecrement={() => setMaxPlayers((prev) => Math.max(MIN_LOBBY_PLAYERS, prev - 1))}
      isCreating={isCreating}
      onCreate={handleCreateLobby}
      onCancel={handleCancel}
    />
  );
};
