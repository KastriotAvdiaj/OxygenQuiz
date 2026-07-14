import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useUser } from "@/lib/Auth";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useNotifications } from "@/common/Notifications";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/dialog";
import { LiftedButton } from "@/common/LiftedButton";

interface CreateLobbyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateLobbyDialog = ({ open, onOpenChange }: CreateLobbyDialogProps) => {
  const navigate = useNavigate();
  const { createSession } = useMultiplayer();
  const { addNotification } = useNotifications();
  const { data: user } = useUser();

  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isCreating, setIsCreating] = useState(false);

  // Generate random room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

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

      // Store session info
      sessionStorage.setItem("quiz_session", JSON.stringify({ 
        sessionId, 
        username 
      }));

      addNotification({
        type: "success",
        title: "Lobby created successfully!"
      });

      // Close dialog and navigate to lobby
      onOpenChange(false);
      navigate(`/multiplayer/lobby/${sessionId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create lobby";
      
      addNotification({
        type: "error",
        title: errorMessage
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset to default
    setMaxPlayers(4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-quiz bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center tracking-wider">
            Create Quiz Lobby
          </DialogTitle>
          {/* <DialogDescription className="text-center">
            Choose how many players can join your lobby
          </DialogDescription> */}
        </DialogHeader>

        <div className="py-6 font-quiz">
          {/* Max Players Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-center block">Max Players</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMaxPlayers(prev => Math.max(2, prev - 1))}
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
                {/* <p className="text-xs text-muted-foreground mt-1">players</p> */}
              </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMaxPlayers(prev => Math.min(10, prev + 1))}
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
            onClick={handleCancel}
            disabled={isCreating}
            liftColor="#e5e7eb" // gray-200 — depth layers match the face
            className="w-full sm:w-auto text-foreground rounded-md bg-background border border-gray-200"
          >
            Cancel
          </LiftedButton>
          <LiftedButton
            type="button"
            onClick={handleCreateLobby}
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
