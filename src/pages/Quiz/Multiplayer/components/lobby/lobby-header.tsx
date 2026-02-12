import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectionStatusBadge } from "./connection-status-badge";

interface LobbyHeaderProps {
  mode: "create" | "join";
  quizTitle: string;
  isConnected: boolean;
  hasJoined: boolean;
  questionCount: number;
  difficulty: string;
  category: string;
}

export const LobbyHeader = ({
  mode,
  quizTitle,
  isConnected,
  hasJoined,
  questionCount,
  difficulty,
  category,
}: LobbyHeaderProps) => {
  return (
    <CardHeader className="text-center space-y-2 py-3 sm:py-4 px-3 sm:px-6 border-b">
      <div className="flex items-center justify-center mb-1 sm:mb-2">
        <ConnectionStatusBadge isConnected={isConnected} />
      </div>

      <div>
        <CardTitle className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-wider font-quiz text-primary transition-all duration-300">
          {mode === "create" ? quizTitle : "Join Game"}
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 font-header transition-all duration-300">
          {mode === "create"
            ? "Multiplayer Quiz Lobby"
            : "Enter details to join the session"}
        </CardDescription>
      </div>

      {hasJoined && (
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 pt-1 sm:pt-2">
          <Badge
            variant="secondary"
            className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-header tracking-wide"
          >
            {questionCount} Questions
          </Badge>
          <Badge
            variant="secondary"
            className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-header tracking-wide"
          >
            {difficulty}
          </Badge>
          <Badge
            variant="secondary"
            className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-header tracking-wide"
          >
            {category}
          </Badge>
        </div>
      )}
    </CardHeader>
  );
};
