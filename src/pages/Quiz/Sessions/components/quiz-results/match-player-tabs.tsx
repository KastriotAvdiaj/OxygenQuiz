import { Trophy, LogOut } from "lucide-react";
import { cn } from "@/utils/cn";
import type { MatchPlayer } from "../../api/get-quiz-session";
import { TabStrip } from "./tab-strip";

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
 * <p><b>You are always first</b>, then everyone else as the final scoreboard had them (the API
 * sorts by score, then correct count, then name) — so the winner is second unless that was you.
 * It was scoreboard order throughout, which put you first in a match you won and second in one
 * you lost: flip between two matches of a lobby and your own tab changed places under the
 * pointer (2026-10-11). The trophy still says who won.</p>
 *
 * <p>Any number of players fits: the row scrolls sideways and grows arrows (`TabStrip`).</p>
 */
export function MatchPlayerTabs({
  players,
  value,
  onValueChange,
  ownSessionId,
}: MatchPlayerTabsProps) {
  // One player is not a match to compare — the review below is simply theirs.
  if (players.length < 2) return null;

  const ordered = [
    ...players.filter((p) => p.sessionId === ownSessionId),
    ...players.filter((p) => p.sessionId !== ownSessionId),
  ];

  return (
    <TabStrip label="Players" ariaLabel="Whose answers to show" className="mb-4">
      {ordered.map((player) => {
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
    </TabStrip>
  );
}
