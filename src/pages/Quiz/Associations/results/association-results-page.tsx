import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { QuizLoadingView } from "@/pages/Quiz/Sessions/components/quiz-loading-view";
import type { AssociationGameView } from "@/types/association-types";
import { associationGameKeys, restartAssociationGame, useAssociationGame } from "../api/association-play";
import { AssociationBoard } from "../board/association-board";
import { END_REASON_TEXT, describeMove, elapsedLabel, scoreBreakdown } from "../board/board-model";
import { DUEL_END_REASON_TEXT, describeDuelMove, duelOutcome } from "../duel/duel-model";

/**
 * `/associations/results/:sessionId` — a finished game: the whole Board revealed, the score line
 * by line, and every move in order. All three come from the same view the game page drew, rebuilt
 * by the server from the move log (docs/quiz/associations.md §9.9). A Duel is reviewed here too,
 * from the reader's own Seat (§10.6): both scores, who won, and who did what.
 */
export const AssociationResultsPage = () => {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const game = useAssociationGame(sessionId);

  if (game.isLoading) return <QuizLoadingView label="Loading your results" />;

  if (game.isError || !game.data) {
    return (
      <div className="flex flex-1 w-full items-center justify-center px-4">
        <div className="max-w-md space-y-5 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">These results aren&apos;t available</h2>
          <Button asChild variant="outline">
            <Link to="/choose-quiz">Back to quizzes</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Still running (a results link opened mid-game): the board is still hidden, so play it.
  if (!game.data.isOver) return <Navigate to={`/associations/play/${sessionId}`} replace />;

  return <Results view={game.data} />;
};

const Results = ({ view }: { view: AssociationGameView }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const playAgain = useMutation({
    mutationFn: () => restartAssociationGame(view.sessionId),
    onSuccess: (fresh) => {
      queryClient.setQueryData(associationGameKeys.detail(fresh.sessionId), fresh);
      navigate(`/associations/play/${fresh.sessionId}`);
    },
  });

  const rows = scoreBreakdown(view);
  const isDuel = view.playStyle === "Duel";
  const nameOf = (seat: number | null) => view.seats.find((s) => s.seat === seat)?.username;

  return (
    // The top padding clears the OVERLAY header this route uses, as the Classic results page does.
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-6 pt-[calc(var(--header-height,4rem)+1.5rem)]">
      <header className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{view.quizTitle}</p>
        {isDuel ? (
          <>
            <h1 className="text-2xl font-bold">{duelOutcome(view, view.mySeat)}</h1>
            <p className="text-sm text-muted-foreground">
              {(view.endReason && DUEL_END_REASON_TEXT[view.endReason]) ?? "Game over"}
            </p>
            <p className="text-2xl font-extrabold tabular-nums">
              {view.seats.map((seat, i) => (
                <span key={seat.seat} className={cn(seat.seat === view.mySeat && "text-primary")}>
                  {i > 0 && <span className="px-2 text-muted-foreground">·</span>}
                  {seat.username} {seat.score}
                </span>
              ))}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{view.endReason ? END_REASON_TEXT[view.endReason] : "Game over"}</h1>
            <p className="text-4xl font-extrabold tabular-nums text-primary">{view.score} pts</p>
          </>
        )}
      </header>

      <AssociationBoard view={view} />

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="breakdown-heading" className="space-y-2">
          <h2 id="breakdown-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Score
          </h2>
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-muted-foreground"> · {row.solution}</span>
                  {isDuel && row.bySeat !== null && <span className="text-muted-foreground"> · {nameOf(row.bySeat)}</span>}
                </span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    row.how === "unsolved" && "text-muted-foreground",
                    row.how === "guessed" && "font-semibold text-quiz-success",
                    row.how === "with the final" && "text-muted-foreground"
                  )}
                >
                  {row.how === "unsolved" ? "—" : row.how === "with the final" ? `${row.points} in the final` : `+${row.points}`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="moves-heading" className="space-y-2">
          <h2 id="moves-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Moves
          </h2>
          {view.moves.length === 0 ? (
            <p className="text-sm text-muted-foreground">No moves were made.</p>
          ) : (
            <ol className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
              {view.moves.map((move) => (
                <li key={move.seq} className="flex gap-3">
                  <span className="w-10 shrink-0 tabular-nums text-muted-foreground">{elapsedLabel(view, move.at)}</span>
                  <span className={cn(move.isCorrect === true && "text-quiz-success", move.isCorrect === false && "text-muted-foreground")}>
                    {isDuel ? describeDuelMove(view, move) : describeMove(view, move)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {/* "Play again" restarts a Solo game; a Duel's rematch is in its lobby. */}
        {!isDuel && (
          <Button onClick={() => playAgain.mutate()} disabled={playAgain.isPending}>
            <RotateCcw className="mr-1 h-4 w-4" /> Play again
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/choose-quiz">Back to quizzes</Link>
        </Button>
      </div>
    </div>
  );
};
