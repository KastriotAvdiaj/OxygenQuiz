/**
 * Formats a quiz time limit as a compact "8m 10s" / "20s" label.
 *
 * Lives on its own rather than inside the card because the start modal and the multiplayer
 * quiz picker show the same label, and they shouldn't have to import a card to get it.
 */
export function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes > 0 ? minutes + "m " : ""}${remainingSeconds}s`;
}
