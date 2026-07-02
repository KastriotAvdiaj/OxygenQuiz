import { Card } from "@/components/ui";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function GameModeSelection() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-foreground">
      <div className="px-4 pb-16 sm:pb-20 md:pb-24">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 md:mb-8 text-center">
          Select Game Mode
        </h1>

        <div className="flex flex-col sm:flex-row items-stretch justify-center w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-foreground p-1 gap-1 rounded-lg">
          <div className="flex-1 w-full">
            <Card
              variant="lifted"
              className="text-center space-y-2 sm:space-y-3 cursor-pointer p-4 sm:p-6 md:p-8 bg-primary hover:scale-105 transition-transform hover:z-50 h-full flex flex-col justify-center"
              onClick={() => navigate("/choose-quiz")}
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-quiz tracking-wider">
                Single Player
              </h2>
              <p className="text-muted text-sm sm:text-base md:text-lg">
                Challenge yourself and test your knowledge on your own time.
              </p>
            </Card>
          </div>
          <div className="flex-1 w-full">
            <Card
              variant="lifted"
              className="text-center space-y-2 sm:space-y-3 cursor-pointer p-4 sm:p-6 md:p-8 hover:scale-105 transition-transform hover:z-50 h-full flex flex-col justify-center"
              onClick={() => navigate("/multiplayer-menu")}
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary font-quiz tracking-wider">
                Multi Player
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                Host a game or join a lobby to compete with friends in real-time.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
