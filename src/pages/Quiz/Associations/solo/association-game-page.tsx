import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, Flag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn } from "@/utils/cn";
import { LiftedButton } from "@/common/LiftedButton";
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
import { AssociationBoard } from "../board/association-board";
import { isOpenTarget, targetLabel } from "../board/board-model";
import { BoardTimer } from "../board/board-timer";
import { useBoardClock } from "../board/use-board-clock";

/** Guess-box length. Mirrors the API's AssociationGameLimits.MaxGuessLength (a longer guess is refused, not cut). */
const MAX_GUESS_LENGTH = 200;

/**
 * `/associations/play/:sessionId` — a Solo game in progress (docs/quiz/associations.md,
 * "Playing"). Open any Tile, guess any Column or the Final, as often as you like, before the
 * board clock runs out. Everything shown comes from the server's view. A game that ends while
 * you play stays on the board for the reveal and a "See results" button; arriving at one that was
 * already over goes straight to the results.
 */
export const AssociationGamePage = () => {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const game = useAssociationGame(sessionId);
  // Seen in play: the ending then plays out on the board instead of jumping to the results.
  const [live, setLive] = useState(false);
  if (game.data && !game.data.isOver && !live) setLive(true);

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
  if (game.data.isOver && !live)
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

  // The guess box's aim. No default: the player picks a Column or the Final each time — a
  // pre-selected Column read as "you must guess this one". Kept only while it still points at
  // something open and a Guess is earned (derived, not synced).
  const [chosenTarget, setChosenTarget] = useState<GuessTarget | null>(null);
  const target =
    view.canGuess && chosenTarget && isOpenTarget(view, chosenTarget)
      ? chosenTarget
      : null;

  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);

  // "You already had this board going" — shown on arrival from a resumed start, until the
  // player's first move says they've chosen to carry on.
  const resumed =
    (location.state as { resumed?: boolean } | null)?.resumed === true;
  const [carriedOn, setCarriedOn] = useState(false);

  const remaining = useBoardClock(
    view.deadlineUtc,
    view.serverNow,
    receivedAtMs,
    !view.isOver,
    onExpire,
  );

  const busy = open.isPending || guess.isPending || giveUp.isPending;
  const over = view.isOver;

  // What to do next, in one sentence — the rule of the turn, said where the eye already is
  // (docs/quiz/associations.md §3.2). Derived from the server's view, never from local guesses.
  const prompt = !view.canGuess
    ? "Open a tile to earn a guess."
    : view.inEndgame
      ? `Every tile is open — ${view.endgameTriesLeft} wrong ${view.endgameTriesLeft === 1 ? "guess" : "guesses"} left.`
      : !target
        ? view.canOpen
          ? "Pick a column or the final solution to guess — or open another tile."
          : "Pick a column or the final solution to guess."
        : `Guess ${targetLabel(target)}.`;

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

  const handleSelectTarget = (next: GuessTarget) => {
    setChosenTarget(next);
    setFeedback(null);
    // Straight to typing: picking the target is the step before it.
    requestAnimationFrame(() =>
      document.getElementById("association-guess")?.focus(),
    );
  };

  const handleGuess = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!target || !trimmed || busy) return;
    setCarriedOn(true);
    guess.mutate(
      { target, text: trimmed },
      {
        onSuccess: (result) => {
          if (result.isCorrect === null) {
            setFeedback({
              tone: "info",
              text: "Time ran out before that guess counted.",
            });
            return;
          }
          setText("");
          setChosenTarget(null);
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
        },
      },
    );
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

        {!over && remaining !== null && (
          <BoardTimer
            remainingMs={remaining}
            totalSeconds={view.boardSeconds}
          />
        )}

        {!over && resumed && !carriedOn && (
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

        {over ? (
          <FinishBanner view={view} />
        ) : (
          <p
            aria-live="polite"
            className="text-center text-sm font-medium text-muted-foreground"
          >
            {prompt}
          </p>
        )}

        <AssociationBoard
          view={view}
          target={target}
          onOpenTile={view.canOpen ? handleOpen : undefined}
          onSelectTarget={view.canGuess ? handleSelectTarget : undefined}
          beckon={view.canGuess && !target}
          busy={busy}
          reveal={over}
        />

        {over ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.35 }}
            className="flex justify-center pt-2"
          >
            <LiftedButton
              onClick={() =>
                navigate(`/associations/results/${view.sessionId}`, {
                  replace: true,
                })
              }
            >
              See results <ArrowRight className="ml-1 h-4 w-4" />
            </LiftedButton>
          </motion.div>
        ) : (
          <>
            <form
              onSubmit={handleGuess}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <Input
                  id="association-guess"
                  aria-label={target ? `Guess ${targetLabel(target)}` : "Guess"}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={MAX_GUESS_LENGTH}
                  autoComplete="off"
                  placeholder={
                    target
                      ? `Your guess for ${targetLabel(target)}`
                      : "Pick a column or the final first"
                  }
                  disabled={!target}
                  variant="settings"
                />
              </div>
              <Button type="submit" disabled={!target || !text.trim() || busy}>
                <Send className="mr-1 h-4 w-4" /> Guess
              </Button>
            </form>

            <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
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
              {confirmGiveUp ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Reveal the board and end the game?
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => giveUp.mutate()}
                    disabled={busy}
                  >
                    Give up
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmGiveUp(false)}
                  >
                    Keep playing
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmGiveUp(true)}
                >
                  <Flag className="mr-1 h-4 w-4" /> Give up
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * The ending, said above the revealed board: a won Final in big letters with the total, or why
 * the game stopped. Replaces the prompt; the timer and guess box are gone by now.
 */
const FinishBanner = ({ view }: { view: AssociationGameView }) => {
  const won = view.endReason === "FinalSolved";
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="text-center"
    >
      {won ? (
        <>
          <p className="text-sm font-medium text-muted-foreground">
            You solved the final
          </p>
          <p className="text-2xl font-bold text-quiz-success break-words sm:text-3xl">
            {view.final.solution}
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {view.score} pts
          </p>
        </>
      ) : (
        <>
          <p className="text-xl font-bold sm:text-2xl">
            {view.endReason === "TimeUp" ? "Time's up" : "Here's the board"}
          </p>
          <p className="text-sm text-muted-foreground">
            Everything you didn&apos;t open, revealed · {view.score} pts
          </p>
        </>
      )}
    </motion.div>
  );
};
