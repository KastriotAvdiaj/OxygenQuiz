import { CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatusBadge } from "./connection-status-badge";

interface LobbyHeaderProps {
  mode: "create" | "join";
  quizTitle: string;
  hasJoined: boolean;
}

export const LobbyHeader = ({
  mode,
  quizTitle,
  hasJoined,
}: LobbyHeaderProps) => {
  return (
    <CardHeader className="py-3 sm:py-4 px-3 sm:px-6 border-b">
      {!hasJoined ? (
        // Pre-join: show title + connection status
        <div className="text-center space-y-1.5">
          <ConnectionStatusBadge />
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold tracking-wider font-quiz text-primary">
            {mode === "create" ? "Create Game" : "Join Game"}
          </CardTitle>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground font-header">
            {mode === "create"
              ? "Set up your lobby"
              : "Enter details to join the session"}
          </p>
        </div>
      ) : (
        // Post-join: clean minimal header
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg md:text-xl font-bold tracking-wider font-quiz text-primary">
            {quizTitle}
          </CardTitle>
          <ConnectionStatusBadge />
        </div>
      )}
    </CardHeader>
  );
};
