import { CountdownRing, type CountdownTone } from "@/pages/Quiz/components/countdown-ring";
import { clockReadout } from "./board-model";

/** Below this share of the time left the ring turns to the warning colour, as a Classic question's does. */
const LOW_TIME_FRACTION = 0.25;

/**
 * The Solo board clock, drawn as the same ring a Classic question uses (`CountdownRing`). It only
 * draws — the countdown is `useBoardClock`'s, and the deadline is the server's. Critical (red,
 * pulsing) in the last `lowAtMs`: 30 seconds by default — a Duel turn, itself 30s, uses 10.
 * Also the Duel's turn clock.
 */
export const BoardTimer = ({
  remainingMs,
  totalSeconds,
  lowAtMs = 30_000,
  label = "Time left",
}: {
  remainingMs: number;
  totalSeconds: number;
  lowAtMs?: number;
  label?: string;
}) => {
  const fraction = totalSeconds > 0 ? remainingMs / (totalSeconds * 1000) : 0;
  const tone: CountdownTone =
    remainingMs <= lowAtMs ? "critical" : fraction < LOW_TIME_FRACTION ? "low" : "normal";
  const { value, unit } = clockReadout(remainingMs);

  return <CountdownRing fraction={fraction} value={value} unit={unit} tone={tone} size="md" label={label} />;
};
