import { useEffect, useRef, useState } from "react";
import { remainingMs } from "./board-model";

/**
 * Milliseconds left on a Solo board, ticking. The deadline is the server's; the client only
 * counts down to it, corrected for clock offset (`serverNow` against when the view arrived), the
 * way docs/quiz/quiz-timer.md asks: an anchored deadline, and primitive-only effect dependencies.
 *
 * `onExpire` runs once when the count reaches zero while the game is still running — the page
 * refetches then, and the server settles the game as TimeUp. The client never decides that the
 * game is over; it only asks.
 */
export function useBoardClock(
  deadlineUtc: string | null,
  serverNow: string,
  receivedAtMs: number,
  running: boolean,
  onExpire: () => void
): number | null {
  const [now, setNow] = useState(() => Date.now());

  // The latest callback without making it a dependency: the interval must not restart on
  // every render just because the parent passed a new arrow function.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!running || !deadlineUtc) return;
    let fired = false;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (!fired && remainingMs(deadlineUtc, serverNow, receivedAtMs, current) === 0) {
        fired = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, deadlineUtc, serverNow, receivedAtMs]);

  return remainingMs(deadlineUtc, serverNow, receivedAtMs, now);
}
