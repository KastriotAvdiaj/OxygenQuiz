import { Link } from "react-router-dom";
import { Pause, Plus, Trophy } from "lucide-react";
import { Card, Spinner } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { LiftedButton } from "@/common/LiftedButton";
import formatDate from "@/lib/date-format";
import { cn } from "@/utils/cn";
import { useHostedGames } from "./api/hosted-games";
import { TEAM_THEME, rankTeams, winnerLine } from "./host/hosted-model";

/**
 * `/my-dashboard/hosted-games` — every game this Teacher has hosted, newest first
 * (docs/quiz/classroom.md, C12). An unfinished one resumes on the Controller; a finished one
 * opens there too, on its final ranking and revealed board.
 */
export const HostedGamesPage = () => {
  const games = useHostedGames();

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Hosted games</h1>
        <Link to="/my-dashboard/host" tabIndex={-1}>
          <LiftedButton className="flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> Host a board
          </LiftedButton>
        </Link>
      </div>

      {games.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !games.data?.length ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center bg-card border dark:border-foreground/30">
          <Trophy className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No hosted games yet.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {games.data.map((game) => (
            <li key={game.id}>
              <Link
                to={`/host/${game.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary dark:border-foreground/30"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold">{game.quizTitle || "Board"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(game.startedAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {rankTeams(game.teams).map((team) => (
                    <span key={team.seat} className="inline-flex items-center gap-1 text-sm">
                      <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", TEAM_THEME[team.colour].dot)} />
                      {team.name} <span className="font-semibold tabular-nums">{team.score}</span>
                    </span>
                  ))}
                  {game.isOver ? (
                    <Badge variant="outline">{winnerLine(game.teams) || "Finished"}</Badge>
                  ) : game.isPaused ? (
                    <Badge variant="secondary">
                      <Pause className="mr-1 h-3 w-3" /> Paused — resume
                    </Badge>
                  ) : (
                    <Badge>Running</Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
