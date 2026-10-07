import { useEffect, useState } from "react";
import type { HostedGameView } from "../api/hosted-games";
import { clockMs } from "./hosted-model";

/** Re-renders every 250 ms while `running`, for the clocks. */
export function useTicker(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);
  return now;
}

/** The two clocks, frozen while paused. `onTurnOver` fires once when the turn clock hits zero. */
export function useHostedClocks(view: HostedGameView, receivedAtMs: number, onTurnOver?: () => void) {
  const running = view.timed && !view.isOver && !view.isPaused;
  const now = useTicker(running);
  const turn = clockMs(view.turnDeadlineUtc, view.turnSecondsLeft, view.serverNow, receivedAtMs, now);
  const game = view.lastRound ? null : clockMs(view.gameDeadlineUtc, view.gameSecondsLeft, view.serverNow, receivedAtMs, now);

  // Ask the server once when the turn runs out: it records the expiry and the turn moves on.
  // An Effect because the trigger is the passage of time, not anything the user did.
  const expired = running && turn === 0;
  useEffect(() => {
    if (expired) onTurnOver?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired, view.turnDeadlineUtc]);

  return { turn, game };
}

