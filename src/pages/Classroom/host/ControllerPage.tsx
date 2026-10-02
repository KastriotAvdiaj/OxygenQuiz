import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, MonitorSmartphone, Pause, Play, Square, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiftedButton } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";
import { QuizLoadingView } from "@/pages/Quiz/Sessions/components/quiz-loading-view";
import { AssociationBoard, type GuessOutcome } from "@/pages/Quiz/Associations/board/association-board";
import type { GuessTarget } from "@/types/association-types";
import { useHostedActions, useHostedGame, type HostedGameView } from "../api/hosted-games";
import { endLine, hostedPrompt, lastGuessLine, teamName } from "./hosted-model";
import { HostedClocks, HostedRanking, TeamsStrip } from "./hosted-parts";
import { useHostedClocks } from "./use-hosted-clocks";
import { useControllerHub } from "./use-hosted-game-hub";

/**
 * `/host/:gameId` — the Controller (docs/quiz/classroom.md, "Screens"). The Teacher makes every
 * move here for whichever Team's turn it is. It fits a phone; with no Display connected it is
 * also what the class sees, which is why the Answer key only exists once a Display is connected.
 */
export const ControllerPage = () => {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const game = useHostedGame(gameId);
  useControllerHub(gameId);

  if (game.isLoading) return <QuizLoadingView label="Loading the game" />;
  if (!game.data)
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <p className="text-lg font-semibold">This game isn&apos;t available.</p>
          <Button asChild variant="outline">
            <Link to="/my-dashboard/hosted-games">Hosted games</Link>
          </Button>
        </div>
      </div>
    );
  return <Controller view={game.data} receivedAtMs={game.dataUpdatedAt} onTurnOver={() => game.refetch()} />;
};

const Controller = ({
  view,
  receivedAtMs,
  onTurnOver,
}: {
  view: HostedGameView;
  receivedAtMs: number;
  onTurnOver: () => void;
}) => {
  const navigate = useNavigate();
  const actions = useHostedActions(view.id);
  const { turn, game } = useHostedClocks(view, receivedAtMs, onTurnOver);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [screenOpen, setScreenOpen] = useState(false);

  const busy = actions.open.isPending || actions.guess.isPending || actions.pass.isPending || actions.undo.isPending;
  const team = teamName(view, view.currentSeat);

  const handleGuess = async (target: GuessTarget, text: string): Promise<GuessOutcome> => {
    try {
      const result = await actions.guess.mutateAsync({ target, text });
      setFeedback(
        result.isCorrect
          ? `Right! +${result.points} for ${team}${result.game.isOver ? "" : " — they may guess again."}`
          : `Not it. ${teamName(result.game, result.game.currentSeat)}'s turn.`,
      );
      return result.isCorrect;
    } catch {
      // The interceptor has said why (a turn that ran out, a pause); keep what was typed.
      return undefined;
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col px-3 py-3 sm:px-4 sm:py-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/my-dashboard/hosted-games"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Hosted games
          </Link>
          {!view.isOver && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // The code is issued when it's first asked for, not with every game.
                  if (!view.screenCode) actions.screenCode.mutate();
                  setScreenOpen(true);
                }}
              >
                <MonitorSmartphone className="mr-1 h-4 w-4" />
                {view.displaysConnected > 0 ? `${view.displaysConnected} screen${view.displaysConnected === 1 ? "" : "s"}` : "Show on a screen"}
              </Button>
              {view.isPaused ? (
                <Button size="sm" onClick={() => actions.resume.mutate()} disabled={actions.resume.isPending}>
                  <Play className="mr-1 h-4 w-4" /> Resume
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => actions.pause.mutate()} disabled={actions.pause.isPending}>
                  <Pause className="mr-1 h-4 w-4" /> Pause
                </Button>
              )}
              <ConfirmationDialog
                icon="danger"
                title="End the game now?"
                body="The game ends with the scores as they are, and the whole board is revealed."
                isDone={actions.end.isSuccess}
                triggerButton={
                  <Button size="sm" variant="outline">
                    <Square className="mr-1 h-4 w-4" /> End game
                  </Button>
                }
                confirmButton={
                  <Button variant="destructive" onClick={() => actions.end.mutate()} disabled={actions.end.isPending}>
                    End game
                  </Button>
                }
              />
            </div>
          )}
        </header>

        <TeamsStrip view={view} />

        {view.isOver ? (
          <div className="space-y-1 pt-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">{endLine(view)}</p>
            <HostedRanking view={view} />
          </div>
        ) : (
          <>
            <HostedClocks view={view} turn={turn} game={game} />
            <p aria-live="polite" className="text-center text-sm font-medium text-muted-foreground sm:text-base">
              {hostedPrompt(view)}
            </p>
          </>
        )}

        <AssociationBoard
          view={view}
          onOpenTile={view.canOpen ? (tileId) => { setFeedback(null); actions.open.mutate(tileId); } : undefined}
          onGuess={view.canGuess ? handleGuess : undefined}
          busy={busy}
          reveal={view.isOver}
          solverName={(seat) => teamName(view, seat)}
        />

        {view.isOver ? (
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <LiftedButton
              onClick={() => actions.again.mutate(undefined, { onSuccess: (next) => navigate(`/host/${next.id}`, { replace: true }) })}
              isPending={actions.again.isPending}
            >
              Play again, same teams
            </LiftedButton>
            <Link to="/my-dashboard/host" tabIndex={-1}>
              <LiftedButton className="bg-muted text-foreground hover:bg-muted" liftColor="muted-foreground">
                Host another board
              </LiftedButton>
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className="min-h-5 text-sm font-medium">
              {feedback ?? lastGuessLine(view)}
            </p>
            <div className="flex gap-2">
              {view.undoLabel && (
                <ConfirmationDialog
                  icon="info"
                  title="Undo the last move?"
                  body={`${view.undoLabel}. The class has already seen it, but the game goes back to before it.`}
                  isDone={actions.undo.isSuccess}
                  triggerButton={
                    <Button size="sm" variant="ghost" disabled={busy}>
                      <Undo2 className="mr-1 h-4 w-4" /> Undo
                    </Button>
                  }
                  confirmButton={
                    <Button onClick={() => actions.undo.mutate(undefined, { onSuccess: () => setFeedback(null) })} disabled={actions.undo.isPending}>
                      Undo
                    </Button>
                  }
                />
              )}
              {view.canPass && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => { setFeedback(null); actions.pass.mutate(); }}>
                  Pass
                </Button>
              )}
            </div>
          </div>
        )}

        {view.answerKey && !view.isOver && <AnswerKey entries={view.answerKey} />}
      </div>

      <ScreenDialog view={view} open={screenOpen} onOpenChange={setScreenOpen} actions={actions} />
    </div>
  );
};

/** Tap a solution to see it, tap again to hide it (C8). Only rendered while a Display is connected. */
const AnswerKey = ({ entries }: { entries: { target: GuessTarget; solution: string }[] }) => {
  const [shown, setShown] = useState<Set<string>>(new Set());
  const toggle = (target: string) =>
    setShown((current) => {
      const next = new Set(current);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  return (
    <section aria-label="Answer key" className="rounded-lg border border-dashed border-border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Answer key — only on this device. Tap to show.</p>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <button
            key={entry.target}
            type="button"
            onClick={() => toggle(entry.target)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
          >
            {shown.has(entry.target) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="font-semibold">{entry.target === "Final" ? "Final" : entry.target}</span>
            <span className={cn(!shown.has(entry.target) && "blur-sm select-none")}>
              {shown.has(entry.target) ? entry.solution : "••••••"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

const ScreenDialog = ({
  view,
  open,
  onOpenChange,
  actions,
}: {
  view: HostedGameView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: ReturnType<typeof useHostedActions>;
}) => {
  const code = view.screenCode;
  const pretty = code ? `${code.slice(0, 4)}-${code.slice(4)}` : "…";
  const url = `${window.location.origin}/screen`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Show the game on a screen</DialogTitle>
          <DialogDescription>
            On the projector or smartboard, open <span className="font-semibold">{url}</span> and type this code. No sign-in needed.
          </DialogDescription>
        </DialogHeader>
        <p className="py-4 text-center font-mono text-4xl font-bold tracking-[0.2em]">{pretty}</p>
        <p className="text-center text-sm text-muted-foreground">
          {view.displaysConnected > 0
            ? `${view.displaysConnected} screen${view.displaysConnected === 1 ? "" : "s"} connected — up to 3. The answer key is now on this device.`
            : "No screen connected yet. Up to 3 can join."}
        </p>
        {view.displaysConnected > 0 && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => actions.disconnectScreens.mutate()} disabled={actions.disconnectScreens.isPending}>
              Disconnect all screens and make a new code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
