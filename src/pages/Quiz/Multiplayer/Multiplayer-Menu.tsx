import { Card } from "@/components/ui";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { CreateLobbyDialog } from "./components/create-lobby-dialog";
import { JoinLobbyDialog } from "./components/join-lobby-dialog";

export function MultiplayerMenu() {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-foreground">
      <div className=" px-4 pb-16 sm:pb-20 md:pb-24">
        <button
          onClick={() => navigate("/choose-mode")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 sm:mb-8 self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Mode Selection
        </button>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 md:mb-8 text-center">
          Multiplayer
        </h1>

        <div className="flex flex-col sm:flex-row items-stretch justify-center w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-foreground p-1 gap-1 rounded-lg">
          <div className="flex-1 w-full">
            <Card
              variant="lifted"
              className="text-center space-y-2 sm:space-y-3 cursor-pointer p-4 sm:p-6 md:p-8 bg-green-600 hover:bg-green-700 hover:scale-105 transition-transform hover:z-50 h-full flex flex-col justify-center text-white"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-quiz tracking-wider">
                Create Lobby
              </h2>
              <p className="text-white/90 text-sm sm:text-base md:text-lg">
                Host a new game session and invite players.
              </p>
            </Card>
          </div>

          <div className="flex-1 w-full">
            <Card
              variant="lifted"
              className="text-center space-y-2 sm:space-y-3 cursor-pointer p-4 sm:p-6 md:p-8 hover:scale-105 transition-transform hover:z-50 h-full flex flex-col justify-center"
              onClick={() => setIsJoinDialogOpen(true)}
            > 
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary font-quiz tracking-wider">
                Join Lobby
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                Enter a game code to join an existing session.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Lobby Dialog */}
      <CreateLobbyDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Join Lobby Dialog */}
      <JoinLobbyDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
      />
    </div>
  );
}
