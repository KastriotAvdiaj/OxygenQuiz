import type { ReactNode } from "react";
import { Gamepad2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SelectedQuiz } from "../../hooks/use-lobby-connection";

interface SelectedQuizDisplayProps {
  selectedQuiz: SelectedQuiz | null;
  isHost: boolean;
  /** Host only — opens the browse dialog, from both the empty state and the "Change" button. */
  onBrowse?: () => void;
}

/** Category / difficulty / length chips. Difficulties are user-defined here, so no colour map. */
const MetaChip = ({ children }: { children: string }) => (
  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:text-[11px]">
    {children}
  </span>
);

const Label = ({ children }: { children: ReactNode }) => (
  <div className="mb-1 flex min-h-[1.5rem] items-center justify-between gap-2">
    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      Selected quiz
    </p>
    {children}
  </div>
);

export const SelectedQuizDisplay = ({
  selectedQuiz,
  isHost,
  onBrowse,
}: SelectedQuizDisplayProps) => {
  if (!selectedQuiz) {
    const message = (
      <p className="text-xs font-medium text-muted-foreground lg:text-sm">
        {isHost
          ? "Select a quiz to play with your lobby"
          : "Waiting for the host to select a quiz..."}
      </p>
    );

    // The dashed box is itself the button for the host — one entry point, no nested control.
    if (isHost && onBrowse) {
      return (
        <button
          type="button"
          onClick={onBrowse}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 lg:p-4"
        >
          <Gamepad2 className="h-5 w-5 text-muted-foreground/50" />
          {message}
          <span className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
            Browse Quizzes
          </span>
        </button>
      );
    }

    return (
      <div className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-center lg:p-4">
        <Gamepad2 className="h-5 w-5 text-muted-foreground/50" />
        {message}
      </div>
    );
  }

  const questionCount = selectedQuiz.questionCount ?? 0;
  const chips = [
    selectedQuiz.category,
    selectedQuiz.difficulty,
    questionCount > 0
      ? `${questionCount} ${questionCount === 1 ? "question" : "questions"}`
      : null,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <div className="min-w-0">
      {/* The "Selected quiz" caption sits above the card rather than inside it — the card is the
          quiz, and captioning it from outside keeps the card itself to just the real content. */}
      <Label>
        {isHost && onBrowse && (
          <Button
            type="button"
            size="none"
            variant="ghost"
            onClick={onBrowse}
            className="h-6 gap-1 rounded-md px-2 text-[11px] text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3 w-3" />
            Change
          </Button>
        )}
      </Label>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 lg:p-3">
        <p className="truncate font-quiz text-sm font-bold tracking-wide text-foreground lg:text-base">
          {selectedQuiz.title}
        </p>
        {chips.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <MetaChip key={chip}>{chip}</MetaChip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
