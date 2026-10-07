import { Pause } from "lucide-react";
import { cn } from "@/utils/cn";
import { BoardTimer } from "@/pages/Quiz/Associations/board/board-timer";
import { MUTED_SURFACE } from "@/pages/Quiz/Associations/board/association-board";
import { formatClock } from "@/pages/Quiz/Associations/board/board-model";
import type { HostedGameView } from "../api/hosted-games";
import { TEAM_THEME, rankTeams, teamName, winnerLine } from "./hosted-model";

/**
 * The pieces the Controller and a Display share (docs/quiz/classroom.md, "Screens"). They only
 * draw the server's view — whose turn, the clocks, the ranking — and decide nothing.
 */

/** The board on a muted card — see `MUTED_SURFACE`. Shared by the Controller and the Displays. */
export const BoardCard = ({ children }: { children: React.ReactNode }) => (
  <div {...MUTED_SURFACE} className={cn(MUTED_SURFACE.className, "rounded-2xl bg-muted p-3 sm:p-5")}>
    {children}
  </div>
);

/**
 * The Teams as the Setup screen draws them: ModeCard-shaped cards filled with each Team's colour
 * (`TEAM_THEME[colour].fill` / `.onFill`). Whose turn it is reads from the fill itself — the
 * Team in play is at full strength and lifted a touch, the others step back to half — so it
 * carries across a classroom, where a thin outline didn't.
 */
export const TeamsStrip = ({ view, large = false }: { view: HostedGameView; large?: boolean }) => (
  // One column per Team so the strip always spans the width evenly — three Teams in a four-column
  // grid left a hole on the right and the strip sat off-centre.
  <div
    className={cn(
      "grid gap-3 pb-1",
      view.teams.length === 2 && "grid-cols-2",
      view.teams.length === 3 && "grid-cols-1 sm:grid-cols-3",
      view.teams.length === 4 && "grid-cols-2 sm:grid-cols-4",
    )}
  >
    {view.teams.map((team) => {
      const theme = TEAM_THEME[team.colour];
      const active = !view.isOver && view.currentSeat === team.seat;
      // At the end every Team is shown at full strength — nobody is "in play" any more.
      const dimmed = !view.isOver && !active;
      return (
        <div
          key={team.seat}
          aria-current={active ? "true" : undefined}
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 transition-[opacity,transform] duration-200",
            theme.fill,
            theme.onFill,
            dimmed && "opacity-50",
            active && "-translate-y-0.5",
          )}
        >
          <span className={cn("truncate font-semibold", large ? "text-lg sm:text-xl" : "text-sm sm:text-base")}>
            {team.name}
          </span>
          <span className={cn("shrink-0 font-bold tabular-nums", large ? "text-xl sm:text-2xl" : "text-lg")}>
            {team.score}
            {team.endgameTurnsLeft != null && (
              <span className="ml-1 text-xs font-medium opacity-80">· {team.endgameTurnsLeft} left</span>
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

