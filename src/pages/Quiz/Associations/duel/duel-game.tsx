import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Send, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn } from "@/utils/cn";
import type { DuelUpdate, DuelView, GuessTarget } from "@/types/association-types";
import { AssociationBoard } from "../board/association-board";
import { isOpenTarget, targetLabel } from "../board/board-model";
import { BoardTimer } from "../board/board-timer";
import { useBoardClock } from "../board/use-board-clock";
import { DUEL_END_REASON_TEXT, describeDuelMove, duelOutcome, turnPrompt } from "./duel-model";
import type { DuelPhase } from "./use-association-match";

/** Guess-box length. Mirrors the API's AssociationGameLimits.MaxGuessLength (a longer guess is refused, not cut). */
const MAX_GUESS_LENGTH = 200;

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

  // The guess box's aim — no default, as in Solo. Kept only while it still points at something
  // open and a Guess is allowed (derived, not synced).
  const [chosenTarget, setChosenTarget] = useState<GuessTarget | null>(null);
  const target = canGuess && chosenTarget && isOpenTarget(view, chosenTarget) ? chosenTarget : null;
  const [text, setText] = useState("");
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

  const handleSelectTarget = (next: GuessTarget) => {
    setChosenTarget(next);
    setRefusal(null);
    requestAnimationFrame(() => document.getElementById("duel-guess")?.focus());
  };

  const handleGuess = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!target || !trimmed || busy) return;
    if (await act(() => onGuess(target, trimmed))) {
      setText("");
      setChosenTarget(null);
    }
  };

  const prompt = turnPrompt(view, mySeat);
  const mySessionId = mySeat !== null ? view.seats.find((s) => s.seat === mySeat)?.sessionId : null;
  const recentMoves = [...view.moves].reverse().slice(0, 6);

  return (
    <div className="flex w-full flex-1 flex-col px-4 py-4 sm:py-6">
      <div className="mx-auto my-auto flex w-full max-w-5xl flex-col gap-4">
        <h1 className="truncate text-center text-base font-semibold sm:text-lg">{view.quizTitle}</h1>

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
              <BoardTimer remainingMs={remaining} totalSeconds={view.turnSeconds} lowAtMs={10_000} label="Time left in this turn" />
            )}
            <p aria-live="polite" className="text-center text-sm font-medium text-muted-foreground">
              {prompt}
            </p>
          </>
        )}

        <AssociationBoard
          view={view}
          target={target}
          onOpenTile={canOpen ? (tileId) => void act(() => onOpenTile(tileId)) : undefined}
          onSelectTarget={canGuess ? handleSelectTarget : undefined}
          beckon={canGuess && !target}
          busy={busy}
        />

        {!view.isOver && (
          <form onSubmit={handleGuess} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input
                id="duel-guess"
                aria-label={target ? `Guess ${targetLabel(target)}` : "Guess"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_GUESS_LENGTH}
                autoComplete="off"
                placeholder={
                  !myTurn
                    ? "Wait for your turn"
                    : target
                      ? `Your guess for ${targetLabel(target)}`
                      : canGuess
                        ? "Pick a column or the final first"
                        : "Open a tile first"
                }
                disabled={!target}
                variant="settings"
              />
            </div>
            <Button type="submit" disabled={!target || !text.trim() || busy}>
              <Send className="mr-1 h-4 w-4" /> Guess
            </Button>
            <Button type="button" variant="outline" disabled={!canPass || busy} onClick={() => void act(onPass)}>
              <SkipForward className="mr-1 h-4 w-4" /> Pass
            </Button>
          </form>
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
