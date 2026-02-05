import { Card } from "@/components/ui";
import { useNavigate } from "react-router-dom";

export function GameModeSelection() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen text-foreground bg-cover bg-center font-header">
      <div className="container relative mx-auto p-4 flex flex-col items-center justify-center min-h-screen ">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 md:mb-16 text-center">Select Game Mode</h1>
        
        <div className="flex flex-col md:flex-row items-stretch justify-center w-full max-w-sm md:max-w-2xl lg:max-w-2xl bg-foreground p-1 gap-1 rounded-md min-h-[50vh] md:min-h-[500px]">
          <div className="flex-1 w-full">
            <Card
              variant="lifted"
              className="text-center space-y-4 cursor-pointer p-6 md:p-8 bg-primary hover:scale-105 transition-transform hover:z-50 h-full flex flex-col justify-center"
              onClick={() => navigate("/choose-quiz?mode=single")}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white font-quiz tracking-wider">
                Single Player 
              </h2>
              <p className="text-white text-base md:text-lg">
                Challenge yourself and test your knowledge on your own time.
              </p>
            </Card>
          </div>
          <div className="flex-1 w-full">
            <Card
              variant="lifted"
              className="text-center space-y-4 cursor-pointer p-6 md:p-8 hover:scale-105 transition-transform hover:z-50 h-full flex flex-col justify-center"
              onClick={() => navigate("/multiplayer-menu")}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-primary font-quiz tracking-wider">
                Multi Player
              </h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Host a game or join a lobby to compete with friends in real-time.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
