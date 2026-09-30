import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { QuizLoadingView } from "@/pages/Quiz/Sessions/components/quiz-loading-view";
import type {
  AssociationGameView,
  GuessTarget,
} from "@/types/association-types";
import {
  associationGameKeys,
  restartAssociationGame,
  useAssociationGame,
  useAssociationMoves,
} from "../api/association-play";
import { AssociationBoard, type GuessOutcome } from "../board/association-board";
import { BoardCoach } from "../board/board-coach";
import { coachStep, targetLabel } from "../board/board-model";
import { BoardTimer } from "../board/board-timer";
import { hasSeenBoardCoach, markBoardCoachSeen } from "../board/coach-storage";
import { useBoardClock } from "../board/use-board-clock";
import { GiveUpControl } from "./give-up-control";

/**
 * `/associations/play/:sessionId` — a Solo game in progress (docs/quiz/associations.md,
 * "Playing"). A Tile earns a Guess; a Guess is typed straight into the Column's or the Final's
 * solution slot; the board clock runs out on the server's deadline. Everything shown comes from the server's view; when the game is over
 * the page hands over to the results.
 */
export const AssociationGamePage = () => {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const game = useAssociationGame(sessionId);

  if (game.isLoading) return <QuizLoadingView label="Loading the board" />;

  if (game.isError || !game.data) {
    return (
      <div className="flex flex-1 w-full items-center justify-center px-4">
        <div className="max-w-md space-y-5 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">This game isn&apos;t available</h2>
          <p className="text-muted-foreground">
            {game.error?.message ??
              "It may belong to someone else, or no longer exist."}
          </p>
          <Button asChild variant="outline">
            <Link to="/choose-quiz">Back to quizzes</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Finished — by the Final, by giving up, or by the clock (the server settles that on read).
  if (game.data.isOver)
    return <Navigate to={`/associations/results/${sessionId}`} replace />;

  return (
    <SoloBoard
      view={game.data}
      receivedAtMs={game.dataUpdatedAt}
      onExpire={() => game.refetch()}
    />
  );
};

type Feedback = { tone: "right" | "wrong" | "info"; text: string } | null;

const SoloBoard = ({
  view,
  receivedAtMs,
  onExpire,
}: {
  view: AssociationGameView;
  receivedAtMs: number;
  onExpire: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { open, guess, giveUp } = useAssociationMoves(view.sessionId);

  const [feedback, setFeedback] = useState<Feedback>(null);

  // "You already had this board going" — shown on arrival from a resumed start, until the
  // player's first move says they've chosen to carry on.
  const resumed =
    (location.state as { resumed?: boolean } | null)?.resumed === true;
  const [carriedOn, setCarriedOn] = useState(false);

  // The first-play guide (docs/quiz/associations.md §9.10): which step is derived from the view;
  // only whether this browser has already been through it is kept.
  const [coachDismissed, setCoachDismissed] = useState(hasSeenBoardCoach);
  const coach = coachStep(view, coachDismissed);
  const dismissCoach = () => {
    markBoardCoachSeen();
    setCoachDismissed(true);
  };

  const remaining = useBoardClock(
    view.deadlineUtc,
    view.serverNow,
    receivedAtMs,
    !view.isOver,
    onExpire,
  );

  const busy = open.isPending || guess.isPending || giveUp.isPending;

  // What to do next, in one sentence — the rule of the turn, said where the eye already is
  // (docs/quiz/associations.md §3.2). Derived from the server's view, never from local guesses.
  const prompt = !view.canGuess
    ? "Open a tile to earn a guess."
    : view.inEndgame
      ? `Every tile is open — ${view.endgameTriesLeft} wrong ${view.endgameTriesLeft === 1 ? "guess" : "guesses"} left.`
      : view.canOpen
        ? "Type a guess into any column or the final — or open another tile."
        : "Type a guess into any column or the final.";

  const restart = useMutation({
    mutationFn: () => restartAssociationGame(view.sessionId),
    onSuccess: (fresh) => {
      queryClient.setQueryData(
        associationGameKeys.detail(fresh.sessionId),
        fresh,
      );
      navigate(`/associations/play/${fresh.sessionId}`, { replace: true });
    },
  });

  const handleOpen = (tileId: number) => {
    setFeedback(null);
    setCarriedOn(true);
    open.mutate(tileId);
  };

  const handleGuess = async (
    target: GuessTarget,
    text: string,
  ): Promise<GuessOutcome> => {
    if (busy) return undefined;
    setCarriedOn(true);
    // The first Guess is the end of the guide, whatever it scores.
    markBoardCoachSeen();
    try {
      const result = await guess.mutateAsync({ target, text });
      if (result.isCorrect === null) {
        setFeedback({
          tone: "info",
          text: "Time ran out before that guess counted.",
        });
        return null;
      }
      setFeedback(
        result.isCorrect
          ? {
              tone: "right",
              text: result.finalSolved
                ? `The final! +${result.points}`
                : `Right! +${result.points} — you've earned another guess.`,
            }
          : { tone: "wrong", text: `Not ${targetLabel(target)}.` },
      );
      return result.isCorrect;
    } catch {
      // The shared interceptor has already told the player why; keep what they typed.
      return undefined;
    }
  };

  return (
    // Vertically centred in the viewport column: my-auto on the inner block, so a short board
    // sits in the middle and a tall one (phones) still starts at the top and scrolls.
    <div className="flex w-full flex-1 flex-col px-4 py-4 sm:py-6">
      <div className="mx-auto my-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Link
            to="/choose-quiz"
            className="inline-flex items-center gap-1 justify-self-start text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Leave
          </Link>
          <h1 className="min-w-0 truncate text-center text-base font-semibold sm:text-lg">
            {view.quizTitle}
          </h1>
          <span
            aria-label="Score"
            className="justify-self-end text-sm font-semibold tabular-nums sm:text-base"
          >
            {view.score} pts
          </span>
        </header>

        {remaining !== null && (
          <div className="flex justify-center">
            <BoardTimer
              remainingMs={remaining}
              totalSeconds={view.boardSeconds}
            />
          </div>
        )}

        {resumed && !carriedOn && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
            <span>
              You already had this board going — here it is, with the clock
              where it was.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => restart.mutate()}
              disabled={restart.isPending}
            >
              Start over
            </Button>
          </div>
        )}

        <p
          aria-live="polite"
          className="text-center text-sm font-medium text-muted-foreground"
        >
          {prompt}
        </p>

        <div className="relative">
          <AssociationBoard
            view={view}
            onOpenTile={view.canOpen ? handleOpen : undefined}
            onGuess={view.canGuess ? handleGuess : undefined}
            busy={busy}
          />
          {coach && (
            <BoardCoach
              step={coach}
              onDismiss={dismissCoach}
            />
          )}
        </div>

        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <p
            aria-live="polite"
            className={cn(
              "text-sm font-medium",
              feedback?.tone === "right" && "text-quiz-success",
              feedback?.tone === "wrong" && "text-destructive",
              feedback?.tone === "info" && "text-muted-foreground",
            )}
          >
            {feedback?.text}
          </p>
          <GiveUpControl onGiveUp={() => giveUp.mutate()} disabled={busy} />
        </div>
      </div>
    </div>
  );
};
