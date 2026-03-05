import { Button } from "@/components/ui/button";
import type { Participant } from "../../hooks/use-lobby-connection";

interface LobbyActionsProps {
  isHost: boolean;
  isReady: boolean;
  canStartQuiz: boolean;
  allPlayersReady: boolean;
  participants: Participant[];
  hasSelectedQuiz: boolean;
  onToggleReady: () => void;
  onStartQuiz: () => void;
}

export const LobbyActions = ({
  isHost,
  isReady,
  canStartQuiz,
  allPlayersReady,
  participants,
  hasSelectedQuiz,
  onToggleReady,
  onStartQuiz,
}: LobbyActionsProps) => {
  const getStartButtonText = () => {
    if (!hasSelectedQuiz) return "Select a Quiz";
    if (participants.length < 2) return "Waiting...";
    if (!allPlayersReady)
      return `Waiting (${participants.filter((p) => !p.isReady).length})`;
    return "START GAME";
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3">
      {!isHost && (
        <Button
          onClick={onToggleReady}
          variant={isReady ? "outline" : "default"}
          className={`flex-1 h-9 sm:h-11 md:h-12 text-xs sm:text-base md:text-lg text-white font-bold font-quiz tracking-wider transition-all shadow-lg ${
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
            className={`flex-1 sm:flex-initial h-9 sm:h-11 md:h-12 px-4 sm:px-6 md:px-8 text-xs sm:text-base md:text-lg font-bold font-quiz tracking-wider transition-all ${
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
            className="flex-[2] h-9 sm:h-11 md:h-12 text-xs sm:text-base md:text-lg font-bold font-quiz tracking-wider shadow-lg hover:-translate-y-1 transition-all"
            size="lg"
          >
            {getStartButtonText()}
          </Button>
        </>
      )}
    </div>
  );
};
