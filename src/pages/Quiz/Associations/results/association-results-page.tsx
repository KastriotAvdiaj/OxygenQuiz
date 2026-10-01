import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FolderIcon, RotateCcw } from "lucide-react";
import { cn } from "@/utils/cn";
import { QuizLoadingView } from "@/pages/Quiz/Sessions/components/quiz-loading-view";
import type { AssociationGameView } from "@/types/association-types";
import { associationGameKeys, restartAssociationGame, useAssociationGame } from "../api/association-play";
import { AssociationBoard } from "../board/association-board";
import { END_REASON_TEXT } from "../board/board-model";
import { DUEL_END_REASON_TEXT, duelOutcome } from "../duel/duel-model";
import { LiftedButton } from "@/common/LiftedButton";

/**
 * `/associations/results/:sessionId` — a finished game: the whole Board revealed, each slot
 * carrying its points, from the same view the game page drew, rebuilt by the server from the move
 * log (docs/quiz/associations.md §9.9). No score table or move list: the board already says it.
 * A Duel is reviewed here too, from the reader's own Seat (§10.6): both scores, who won, and who
 * solved each slot.
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
          <Link to="/choose-quiz" tabIndex={-1} className="inline-block">
            <LiftedButton className="bg-muted text-foreground" liftColor="muted-foreground">
            <FolderIcon className="mr-1 h-4 w-4" />
              Back to quizzes
            </LiftedButton>
          </Link>
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

  const isDuel = view.playStyle === "Duel";
  const nameOf = (seat: number) => view.seats.find((s) => s.seat === seat)?.username;

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

      <AssociationBoard view={view} solverName={isDuel ? nameOf : undefined} />

      <div className="flex flex-wrap justify-center gap-3">
        {/* "Play again" restarts a Solo game; a Duel's rematch is in its lobby. */}
        {!isDuel && (
          <LiftedButton onClick={() => playAgain.mutate()} isPending={playAgain.isPending}>
            <RotateCcw className="mr-1 h-4 w-4" /> Play again
          </LiftedButton>
        )}
        <Link to="/choose-quiz" tabIndex={-1}>
          <LiftedButton className="bg-muted text-foreground hover:bg-muted" liftColor="muted-foreground">
            <FolderIcon className="mr-1 h-4 w-4" />
            Back to quizzes
          </LiftedButton>
        </Link>
      </div>
    </div>
  );
};
