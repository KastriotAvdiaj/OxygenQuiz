import { Pause } from "lucide-react";
import { cn } from "@/utils/cn";
import { BoardTimer } from "@/pages/Quiz/Associations/board/board-timer";
import { formatClock } from "@/pages/Quiz/Associations/board/board-model";
import type { HostedGameView } from "../api/hosted-games";
import { TEAM_THEME, rankTeams, teamName, winnerLine } from "./hosted-model";

/**
 * The pieces the Controller and a Display share (docs/quiz/classroom.md, "Screens"). They only
 * draw the server's view — whose turn, the clocks, the ranking — and decide nothing.
 */

export const TeamsStrip = ({ view, large = false }: { view: HostedGameView; large?: boolean }) => (
  <div className={cn("grid gap-2", view.teams.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
    {view.teams.map((team) => {
      const theme = TEAM_THEME[team.colour];
      const active = !view.isOver && view.currentSeat === team.seat;
      return (
        <div
          key={team.seat}
          aria-current={active ? "true" : undefined}
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 transition-colors",
            active ? cn(theme.active, theme.soft) : "border-border",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden className={cn("h-3 w-3 shrink-0 rounded-full", theme.dot)} />
            <span className={cn("truncate font-semibold", large ? "text-lg sm:text-xl" : "text-sm sm:text-base")}>
              {team.name}
            </span>
          </span>
          <span className={cn("shrink-0 font-bold tabular-nums", large ? "text-xl sm:text-2xl" : "text-base")}>
            {team.score}
            {team.endgameTurnsLeft != null && (
              <span className="ml-1 text-xs font-medium text-muted-foreground">· {team.endgameTurnsLeft} left</span>
            )}
          </span>
        </div>
      );
    })}
  </div>
);

export const HostedClocks = ({
  view,
  turn,
  game,
}: {
  view: HostedGameView;
  turn: number | null;
  game: number | null;
}) => {
  if (view.isOver) return null;
  if (view.isPaused)
    return (
      <div className="flex items-center justify-center gap-2 text-lg font-semibold text-muted-foreground">
        <Pause className="h-5 w-5" /> Paused
      </div>
    );
  if (!view.timed) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      {turn != null && view.turnSeconds && (
        <BoardTimer remainingMs={turn} totalSeconds={view.turnSeconds} lowAtMs={10_000} label={`${teamName(view, view.currentSeat)}'s turn`} />
      )}
      <p className="text-sm font-medium tabular-nums text-muted-foreground">
        {view.lastRound ? "Last round" : game != null ? `${formatClock(game)} left in the game` : null}
      </p>
    </div>
  );
};

/** The final ranking — ties shown as ties. */
export const HostedRanking = ({ view, large = false }: { view: HostedGameView; large?: boolean }) => (
  <div className="space-y-3 text-center">
    <p className={cn("font-bold", large ? "text-3xl sm:text-4xl" : "text-2xl")}>{winnerLine(view.teams)}</p>
    <ol className="mx-auto max-w-md space-y-1.5">
      {rankTeams(view.teams).map((team) => (
        <li key={team.seat} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <span className="flex items-center gap-2">
            <span className="w-6 text-left font-semibold tabular-nums text-muted-foreground">{team.rank}.</span>
            <span aria-hidden className={cn("h-3 w-3 rounded-full", TEAM_THEME[team.colour].dot)} />
            <span className="font-semibold">{team.name}</span>
            {team.tied && <span className="text-xs text-muted-foreground">tied</span>}
          </span>
          <span className="font-bold tabular-nums">{team.score}</span>
        </li>
      ))}
    </ol>
  </div>
);

