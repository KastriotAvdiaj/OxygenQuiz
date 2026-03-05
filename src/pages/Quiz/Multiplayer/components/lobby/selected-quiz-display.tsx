import { Badge } from "@/components/ui/badge";
import { HelpCircle, Gamepad2 } from "lucide-react";
import type { SelectedQuiz } from "../../hooks/use-lobby-connection";

interface SelectedQuizDisplayProps {
  selectedQuiz: SelectedQuiz | null;
  isHost: boolean;
}

export const SelectedQuizDisplay = ({
  selectedQuiz,
  isHost,
}: SelectedQuizDisplayProps) => {
  if (!selectedQuiz) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border/60 p-4 sm:p-5 text-center space-y-2">
        <Gamepad2 className="h-6 w-6 mx-auto text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          {isHost
            ? "Select a quiz to play with your lobby"
            : "Waiting for the host to select a quiz..."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
            Selected Quiz
          </p>
          <p className="text-sm sm:text-base font-bold font-quiz tracking-wider text-foreground truncate">
            {selectedQuiz.title}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] font-bold px-2 py-0.5 bg-primary/15 text-primary border-primary/30 flex-shrink-0"
        >
          Ready
        </Badge>
      </div>
    </div>
  );
};
