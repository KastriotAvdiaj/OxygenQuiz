import { Trophy } from "lucide-react";
import { cn } from "@/utils/cn";
import { TabStrip } from "@/pages/Quiz/Sessions/components/quiz-results/tab-strip";
import type { MatchSummary } from "../../api/matches";

type MatchPickerProps = {
  /** The lobby's matches, newest first — the order they are shown in. */
  matches: MatchSummary[];
  /** The selected match's id. */
  value: string;
  onValueChange: (matchId: string) => void;
  /** The viewer's account id: a trophy marks the matches they won. */
  userId: string | undefined;
};

/**
 * Which of a lobby's matches the review is showing — the "Matches" box of the review dialog
 * (docs/quiz/multiplayer.md §7.6).
 *
 * Newest first, numbered in the order they were played. Hidden while there is only one: a single
 * tab is not a choice. Any number fits: the row scrolls and grows arrows (`TabStrip`).
 */
export function MatchPicker({ matches, value, onValueChange, userId }: MatchPickerProps) {
  if (matches.length < 2) return null;

  return (
    <TabStrip label="Matches" ariaLabel="Which match to review">
      {matches.map((m, index) => {
        const active = m.matchId === value;
        const won = m.players.some((p) => p.userId === userId && p.isWinner);
        return (
          <button
            key={m.matchId}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange(m.matchId)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary bg-primary/10 font-medium text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {won && <Trophy className="h-3.5 w-3.5 text-yellow-500" aria-label="You won" />}
            <span>Match {matches.length - index}</span>
            <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{m.quizTitle}</span>
          </button>
        );
      })}
    </TabStrip>
  );
}
