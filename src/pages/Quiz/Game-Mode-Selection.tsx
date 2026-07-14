import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RadioTower,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";
import { ModeCard } from "./components/mode-card";

export function GameModeSelection() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center text-foreground">
      <div className="w-full max-w-sm px-4 pb-16 sm:max-w-xl sm:pb-20 md:max-w-2xl md:pb-24 lg:max-w-3xl">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Home
        </button>

        <div className="grid items-stretch gap-4 sm:grid-cols-2 sm:gap-6">
          <ModeCard
            icon={UserRound}
            title="Single Player"
            description="Challenge yourself and test your knowledge on your own time."
            meta="Instant start — no lobby"
            metaIcon={Zap}
            accent="foreground"
            onSelect={() => navigate("/choose-quiz")}
          />
          <ModeCard
            icon={UsersRound}
            title="Multi Player"
            description="Host a game or join a lobby to compete with friends in real-time."
            meta="Live lobby with friends"
            metaIcon={RadioTower}
            accent="primary"
            onSelect={() => navigate("/multiplayer-menu")}
            delay={0.08}
          />
        </div>
      </div>
    </div>
  );
}
