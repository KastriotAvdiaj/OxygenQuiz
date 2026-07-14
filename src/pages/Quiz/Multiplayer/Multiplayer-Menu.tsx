import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Hash, KeyRound, Settings2 } from "lucide-react";
import { ModeCard } from "../components/mode-card";
import { CreateLobbyDialog } from "./components/create-lobby-dialog";
import { JoinLobbyDialog } from "./components/join-lobby-dialog";

export function MultiplayerMenu() {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center text-foreground">
      <div className="w-full max-w-sm px-4 pb-16 sm:max-w-xl sm:pb-20 md:max-w-2xl md:pb-24 lg:max-w-3xl">
        <button
          onClick={() => navigate("/choose-mode")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Mode Selection
        </button>

        <div className="grid items-stretch gap-4 sm:grid-cols-2 sm:gap-6">
          <ModeCard
            icon={Crown}
            title="Create Lobby"
            description="Host a new game session and invite players."
            meta="You pick the quiz & settings"
            metaIcon={Settings2}
            accent="green"
            onSelect={() => setIsCreateDialogOpen(true)}
          />
          <ModeCard
            icon={KeyRound}
            title="Join Lobby"
            description="Enter a game code to join an existing session."
            meta="Just need a game code"
            metaIcon={Hash}
            accent="primary"
            onSelect={() => setIsJoinDialogOpen(true)}
            delay={0.08}
          />
        </div>
      </div>

      <CreateLobbyDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      <JoinLobbyDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
      />
    </div>
  );
}
