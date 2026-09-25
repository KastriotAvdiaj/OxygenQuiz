import { useCallback, useEffect, useState } from "react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { hubErrorMessage } from "@/context/hub-error";
import type { DuelUpdate, DuelView, GuessTarget } from "@/types/association-types";

export type DuelPhase = "idle" | "starting" | "playing" | "ended";

/**
 * The Associations Duel's state on this client, driven purely by server events on the shared
 * lobby connection (docs/quiz/associations.md §10.3). The lobby page renders the Duel screen
 * whenever `isActive`.
 *
 * **Its own listener set and its own event names** — `Duel*`, never a Classic one. The shared
 * connection's `off(name)` removes every handler for that name, so this hook and `useMatch` must
 * not subscribe to the same event (docs/quiz/multiplayer.md §1).
 *
 * Every event carries the whole view, so there is no merging: the latest view replaces the last,
 * and a missed event is repaired by the next. `receivedAtMs` is when it arrived, for correcting
 * the turn clock by the view's `serverNow`.
 */
export const useAssociationMatch = (sessionId: string) => {
  const { connection } = useMultiplayer();

  const [phase, setPhase] = useState<DuelPhase>("idle");
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [view, setView] = useState<DuelView | null>(null);
  const [receivedAtMs, setReceivedAtMs] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<DuelUpdate | null>(null);

  useEffect(() => {
    if (!connection) return;

    const show = (next: DuelView) => {
      setView(next);
      setReceivedAtMs(Date.now());
    };

    connection.on("DuelStarting", (seconds: number) => {
      setPhase("starting");
      setCountdownSeconds(seconds);
      setView(null);
      setLastUpdate(null);
    });
    connection.on("DuelStarted", (next: DuelView) => {
      setPhase("playing");
      show(next);
    });
    connection.on("DuelUpdated", (update: DuelUpdate) => {
      setLastUpdate(update);
      show(update.view);
      // A client that missed DuelStarted (it rejoined during the countdown) still gets the board.
      setPhase((current) => (current === "idle" || current === "starting" ? "playing" : current));
    });
    connection.on("DuelEnded", (next: DuelView) => {
      setPhase("ended");
      show(next);
    });
    // Catch-up after a (re)join mid-Duel: the board as it stands.
    connection.on("DuelState", (next: DuelView) => {
      setPhase(next.isOver ? "ended" : "playing");
      show(next);
    });

    return () => {
      connection.off("DuelStarting");
      connection.off("DuelStarted");
      connection.off("DuelUpdated");
      connection.off("DuelEnded");
      connection.off("DuelState");
    };
  }, [connection]);

  // The server decides everything; a refusal comes back as its own sentence to show.
  const invoke = useCallback(
    async (method: string, ...args: unknown[]) => {
      if (!connection) throw new Error("Not connected to the server.");
      try {
        await connection.invoke(method, sessionId, ...args);
      } catch (err) {
        throw new Error(hubErrorMessage(err, "That move didn't go through. Try again."));
      }
    },
    [connection, sessionId],
  );

  const openTile = useCallback((tileId: number) => invoke("OpenTile", tileId), [invoke]);
  const guess = useCallback((target: GuessTarget, text: string) => invoke("GuessAssociation", target, text), [invoke]);
  const pass = useCallback(() => invoke("PassTurn"), [invoke]);

  /** Back to the lobby — local only; the server has already reset (multiplayer.md §3.4). */
  const reset = useCallback(() => {
    setPhase("idle");
    setView(null);
    setLastUpdate(null);
  }, []);

  return {
    phase,
    isActive: phase !== "idle",
    countdownSeconds,
    view,
    receivedAtMs,
    lastUpdate,
    openTile,
    guess,
    pass,
    reset,
  };
};

export type AssociationMatch = ReturnType<typeof useAssociationMatch>;
