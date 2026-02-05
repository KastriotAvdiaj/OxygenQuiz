import { Card } from "@/components/ui";
import { useNavigate } from "react-router-dom";
import { QuizHeader } from "./components/quiz-header";
import { ArrowLeft } from "lucide-react";

export function MultiplayerMenu() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen pb-20 text-foreground bg-cover bg-center font-header">
      <QuizHeader />

      <div className="container relative mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-4xl mb-8">
            <button 
                onClick={() => navigate("/choose-mode")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Mode Selection
            </button>
        </div>

        <h1 className="text-4xl font-bold mb-12 text-center">Multiplayer</h1>
        
        <div className="flex flex-col md:flex-row items-stretch justify-center w-full max-w-sm md:max-w-2xl lg:max-w-2xl bg-foreground p-1 gap-1 rounded-md min-h-[50vh] md:min-h-[500px]">
          <div className="flex-1 w-full">
            <Card
              variant="lifted"
              className="text-center space-y-4 cursor-pointer p-6 md:p-8 bg-green-600 hover:bg-green-700 hover:scale-105 transition-all hover:z-50 h-full flex flex-col justify-center text-white"
              onClick={() => navigate("/choose-quiz?mode=multiplayer")}
            >
              <h2 className="text-2xl md:text-3xl font-bold font-quiz tracking-wider">
                Create Lobby
              </h2>
              <p className="text-white/90 text-base md:text-lg">
                Host a new game session and invite players.
              </p>
            </Card>
          </div>

          <div className="flex-1 w-full">
            <Card
              variant="lifted"
              className="text-center space-y-4 cursor-pointer p-6 md:p-8 hover:scale-105 transition-transform hover:z-50 h-full flex flex-col justify-center"
              onClick={() => navigate("/join-session")}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-primary font-quiz tracking-wider">
                Join Lobby
              </h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Enter a game code to join an existing session.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
