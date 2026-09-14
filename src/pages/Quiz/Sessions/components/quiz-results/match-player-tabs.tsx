import { Trophy, LogOut } from "lucide-react";
import { cn } from "@/utils/cn";
import type { MatchPlayer } from "../../api/get-quiz-session";

type MatchPlayerTabsProps = {
  players: MatchPlayer[];
  /** The session being shown right now — one of `players`' session ids. */
  value: string;
  onValueChange: (sessionId: string) => void;
  /** The viewer's own session, marked so they can find themselves at a glance. */
  ownSessionId: string;
};

/**
 * Whose answers you are looking at, in a finished match.
 *
 * <p>Everyone who played can read everyone's answers, permanently — you were all in the same room
 * being asked the same questions, so hiding it afterwards would be strange, and "what did you put
 * for number four?" is the conversation this screen exists to settle.</p>
 *
 * <p>Ordered exactly as the final scoreboard was (the API sorts by score, then correct count, then
 * name), so the row reads the way the players last saw themselves.</p>
 */
export function MatchPlayerTabs({
  players,
  value,
  onValueChange,
  ownSessionId,
}: MatchPlayerTabsProps) {
  // One player is not a match to compare — the review below is simply theirs.
  if (players.length < 2) return null;

  return (
    <div
      role="tablist"
      aria-label="Whose answers to show"
      // Scrolls rather than wraps: a lobby holds up to four, and a wrapped second row of tabs
      // reads as a separate control rather than more of the same one.
      className="mb-4 flex gap-2 overflow-x-auto pb-1"
    >
      {players.map((player) => {
        const active = player.sessionId === value;
        const isYou = player.sessionId === ownSessionId;

        return (
          <button
            key={player.sessionId}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange(player.sessionId)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary bg-primary/10 font-medium text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {player.isWinner && (
              <Trophy className="h-3.5 w-3.5 text-yellow-500" aria-label="Winner" />
            )}
            <span>{player.username}</span>
            {isYou && (
              <span className="rounded bg-muted px-1 text-[10px] uppercase tracking-wide">
                You
              </span>
            )}
            <span className="tabular-nums text-xs text-muted-foreground">
              {player.totalScore}
            </span>
            {player.leftEarly && (
              // Said once, here, rather than on every blank question below: the reason those
              // questions are empty is a fact about the player, not about each question.
              <LogOut
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-label="Left before the end"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
