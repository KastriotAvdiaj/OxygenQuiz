import { useState } from "react";
import { MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { AssociationBoard } from "@/pages/Quiz/Associations/board/association-board";
import type { HostedGameView } from "../api/hosted-games";
import { endLine, hostedPrompt, lastGuessLine, teamName } from "./hosted-model";
import { BoardCard, HostedClocks, HostedRanking, TeamsStrip } from "./hosted-parts";
import { useHostedClocks } from "./use-hosted-clocks";
import { useDisplayHub } from "./use-hosted-game-hub";

/**
 * `/screen` — a Display (docs/quiz/classroom.md, "Screens"; ADR 0024). Any browser, no sign-in:
 * type the Screen code from the Teacher's device and the game appears, big, and follows every move.
 * Read-only, and it only ever receives what the room may see.
 */
export const DisplayPage = () => {
  const { state, join } = useDisplayHub();

  if (state.status === "showing") return <Display view={state.view} receivedAtMs={state.receivedAtMs} />;

  return (
    <div className="flex w-full flex-1 items-center justify-center px-4">
      <CodeForm
        onJoin={join}
        joining={state.status === "joining"}
        error={state.status === "error" ? state.message : null}
      />
    </div>
  );
};

const CodeForm = ({ onJoin, joining, error }: { onJoin: (code: string) => void; joining: boolean; error: string | null }) => {
  const [code, setCode] = useState("");
  return (
    <form
      className="w-full max-w-sm space-y-4 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        onJoin(code);
      }}
    >
      <MonitorPlay className="mx-auto h-10 w-10 text-primary" />
      <h1 className="text-2xl font-bold">Show a game on this screen</h1>
      <p className="text-sm text-muted-foreground">
        Type the code from the teacher&apos;s device — &ldquo;Show on a screen&rdquo;.
      </p>
      <Input
        variant="minimal"
        aria-label="Screen code"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        placeholder="ABCD-1234"
        maxLength={12}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        className="text-center font-quiz text-2xl font-bold tracking-[0.15em]"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={joining || code.replace(/[^A-Za-z0-9]/g, "").length < 8}>
        {joining ? "Joining…" : "Show the game"}
      </Button>
    </form>
  );
};

const Display = ({ view, receivedAtMs }: { view: HostedGameView; receivedAtMs: number }) => {
  // No onTurnOver: the Controller asks the server when a turn runs out; this screen hears the result.
  const { turn, game } = useHostedClocks(view, receivedAtMs);
  return (
    <div className="flex w-full flex-1 flex-col px-4 py-4 sm:px-8 sm:py-6">
      <div className="mx-auto my-auto flex w-full max-w-6xl flex-col gap-5">
        <TeamsStrip view={view} large />
        {view.isOver ? (
          <div className="space-y-1 text-center">
            <p className="text-base font-medium text-muted-foreground">{endLine(view)}</p>
            <HostedRanking view={view} large />
          </div>
        ) : (
          <>
            <HostedClocks view={view} turn={turn} game={game} />
            <p className="text-center text-xl font-semibold sm:text-2xl">{hostedPrompt(view)}</p>
          </>
        )}
        <BoardCard>
          <AssociationBoard view={view} reveal={view.isOver} solverName={(seat) => teamName(view, seat)} />
        </BoardCard>
        {!view.isOver && <p className="min-h-6 text-center text-lg font-medium">{lastGuessLine(view)}</p>}
      </div>
    </div>
  );
};
