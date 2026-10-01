import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Crown, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { DuelUpdate, DuelView, GuessTarget } from "@/types/association-types";
import { AssociationBoard, type GuessOutcome } from "../board/association-board";
import { BoardTimer } from "../board/board-timer";
import { useBoardClock } from "../board/use-board-clock";
import { DUEL_END_REASON_TEXT, describeDuelMove, duelOutcome, turnPrompt } from "./duel-model";
import type { DuelPhase } from "./use-association-match";

export type DuelGameProps = {
  phase: DuelPhase;
  countdownSeconds: number;
  view: DuelView | null;
  receivedAtMs: number;
  lastUpdate: DuelUpdate | null;
  /** The reader's Seat; null for someone in the lobby who isn't playing. */
  mySeat: number | null;
  onOpenTile: (tileId: number) => Promise<void>;
  onGuess: (target: GuessTarget, text: string) => Promise<void>;
  onPass: () => Promise<void>;
  /** Back to the lobby (local — the server is already there). */
  onExit: () => void;
};

/**
 * The Associations Duel (docs/quiz/associations.md §3.3, §10): both players, one Board, taking
 * turns. Prop-driven — the lobby page feeds it `useAssociationMatch` — and it never decides a
 * rule: whose turn it is, what the turn allows, the clock and the result all come from the
 * server's view. Moves go up as callbacks; the next view comes down as an event.
 */
export const DuelGame = (props: DuelGameProps) => {
  const { phase, countdownSeconds, view } = props;

  if (phase === "starting" || !view) {
    return (
      <div className="flex w-full flex-1 items-center justify-center px-4">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Associations duel</p>
          <p className="text-2xl font-bold">Get ready…</p>
          <p className="text-sm text-muted-foreground">
            The board goes up in {countdownSeconds} {countdownSeconds === 1 ? "second" : "seconds"}. The server picks who
            opens.
          </p>
        </div>
      </div>
    );
  }

  return <DuelBoard {...props} view={view} />;
};

type Feedback = { tone: "right" | "wrong" | "info"; text: string } | null;

const DuelBoard = ({
  phase,
  view,
  receivedAtMs,
  lastUpdate,
  mySeat,
  onOpenTile,
  onGuess,
  onPass,
  onExit,
}: DuelGameProps & { view: DuelView }) => {
  const myTurn = !view.isOver && mySeat !== null && view.currentSeat === mySeat;
  const canOpen = myTurn && view.canOpen;
  const canGuess = myTurn && view.canGuess;
  const canPass = myTurn && view.canPass;

  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  // The turn clock. The server keeps it and records an expired turn; this only counts down to
  // the deadline it sent, corrected for clock offset (docs/quiz/quiz-timer.md).
  const remaining = useBoardClock(view.turnDeadlineUtc, view.serverNow, receivedAtMs, !view.isOver, () => {});

  // What just happened, in one line — the latest move, from whoever made it (D15: the opponent's
  // wrong guesses are shown too). A refusal of this player's own move takes its place.
  const feedback: Feedback = refusal
    ? { tone: "info", text: refusal }
    : lastUpdate?.move
      ? {
          tone: lastUpdate.isCorrect === true ? "right" : lastUpdate.isCorrect === false ? "wrong" : "info",
          text: describeDuelMove(view, lastUpdate.move),
        }
      : null;

  const act = async (move: () => Promise<void>) => {
    setBusy(true);
    setRefusal(null);
    try {
      await move();
      return true;
    } catch (err) {
      setRefusal(err instanceof Error ? err.message : "That move didn't go through.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Right or wrong arrives as the next view (`lastUpdate`), not as the invoke's answer, so the
  // slot learns only that the Guess went through: it clears, and the feedback line says the rest.
  const handleGuess = async (target: GuessTarget, text: string): Promise<GuessOutcome> => {
    if (busy) return undefined;
    return (await act(() => onGuess(target, text))) ? null : undefined;
  };

  const prompt = turnPrompt(view, mySeat);
  const mySessionId = mySeat !== null ? view.seats.find((s) => s.seat === mySeat)?.sessionId : null;
  const recentMoves = [...view.moves].reverse().slice(0, 6);

  return (
    <div className="flex w-full flex-1 flex-col px-4 py-4 sm:py-6">
      <div className="mx-auto my-auto flex w-full max-w-5xl flex-col gap-4">
        {/* Not on screen: the title hints at the Final (docs/quiz/associations.md §9.9). */}
        <h1 className="sr-only">Associations duel</h1>

        {/* The two Seats: name and score, the one whose turn it is marked. */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {view.seats.map((seat) => {
            const active = !view.isOver && view.currentSeat === seat.seat;
            const winner = view.isOver && view.winnerSeat === seat.seat;
            return (
              <div
                key={seat.seat}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border-2 px-3 py-2",
                  active ? "border-primary bg-primary/10" : "border-border bg-muted/40",
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold">
                  {winner && <Crown className="h-4 w-4 shrink-0 text-primary" />}
                  <span className="truncate">{seat.username}</span>
                  {seat.seat === mySeat && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                </span>
                <span className="text-lg font-bold tabular-nums">{seat.score}</span>
              </div>
            );
          })}
        </div>

        {view.isOver ? (
          <div className="space-y-1 text-center">
            <p className="text-2xl font-bold">{duelOutcome(view, mySeat)}</p>
            {view.endReason && <p className="text-sm text-muted-foreground">{DUEL_END_REASON_TEXT[view.endReason]}</p>}
          </div>
        ) : (
          <>
            {remaining !== null && (
              <div className="flex justify-center">
                <BoardTimer remainingMs={remaining} totalSeconds={view.turnSeconds} lowAtMs={10_000} label="Time left in this turn" />
              </div>
            )}
            <p aria-live="polite" className="text-center text-sm font-medium text-muted-foreground">
              {prompt}
            </p>
          </>
        )}

        <AssociationBoard
          view={view}
          onOpenTile={canOpen ? (tileId) => void act(() => onOpenTile(tileId)) : undefined}
          onGuess={canGuess ? handleGuess : undefined}
          busy={busy}
          reveal={view.isOver}
          solverName={(seat) => view.seats.find((s) => s.seat === seat)?.username}
        />

        {!view.isOver && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={!canPass || busy} onClick={() => void act(onPass)}>
              <SkipForward className="mr-1 h-4 w-4" /> Pass
            </Button>
          </div>
        )}

        <p
          aria-live="polite"
          className={cn(
            "min-h-5 text-center text-sm font-medium",
            feedback?.tone === "right" && "text-quiz-success",
            feedback?.tone === "wrong" && "text-destructive",
            feedback?.tone === "info" && "text-muted-foreground",
          )}
        >
          {feedback?.text}
        </p>

        {recentMoves.length > 0 && (
          <ol className="space-y-0.5 text-xs text-muted-foreground" aria-label="Recent moves">
            {recentMoves.map((move) => (
              <li key={move.seq}>{describeDuelMove(view, move)}</li>
            ))}
          </ol>
        )}

        {phase === "ended" && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {mySessionId && (
              <Button asChild variant="outline">
                {/* A new tab: reviewing shouldn't take you out of the lobby, where a rematch is one click. */}
                <Link to={`/associations/results/${mySessionId}`} target="_blank" rel="noreferrer">
                  Review the duel
                </Link>
              </Button>
            )}
            <Button onClick={onExit}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to lobby
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
