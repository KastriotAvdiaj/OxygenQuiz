import { Button } from "@/components/ui/button";
import type { Participant } from "../../hooks/use-lobby-connection";

interface LobbyActionsProps {
  isHost: boolean;
  isReady: boolean;
  canStartQuiz: boolean;
  allPlayersReady: boolean;
  participants: Participant[];
  onToggleReady: () => void;
  onStartQuiz: () => void;
}

export const LobbyActions = ({
  isHost,
  isReady,
  canStartQuiz,
  allPlayersReady,
  participants,
  onToggleReady,
  onStartQuiz,
}: LobbyActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 pt-1 sm:pt-2">
      {!isHost && (
        <Button
          onClick={onToggleReady}
          variant={isReady ? "outline" : "default"}
          className={`flex-1 h-10 sm:h-12 md:h-14 text-sm sm:text-lg md:text-xl font-bold font-quiz tracking-wider transition-all shadow-lg ${
            isReady
              ? "border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              : "hover:-translate-y-1"
          }`}
        >
          {isReady ? "READY!" : "READY UP"}
        </Button>
      )}

      {isHost && (
        <>
          <Button
            onClick={onToggleReady}
            variant={isReady ? "outline" : "secondary"}
            className={`flex-1 sm:flex-initial h-10 sm:h-12 md:h-14 px-4 sm:px-6 md:px-8 text-sm sm:text-lg md:text-xl font-bold font-quiz tracking-wider transition-all ${
              isReady
                ? "border-2 border-emerald-500 text-emerald-600 bg-emerald-50/50"
                : ""
            }`}
          >
            {isReady ? "READY" : "READY UP"}
          </Button>

          <Button
            onClick={onStartQuiz}
            disabled={!canStartQuiz}
            className="flex-[2] h-10 sm:h-12 md:h-14 text-sm sm:text-lg md:text-xl font-bold font-quiz tracking-wider shadow-lg hover:-translate-y-1 transition-all"
            size="lg"
          >
            {participants.length < 2
              ? "Waiting..."
              : !allPlayersReady
                ? `Waiting (${participants.filter((p) => !p.isReady).length})`
                : "START GAME"}
          </Button>
        </>
      )}
    </div>
  );
};
