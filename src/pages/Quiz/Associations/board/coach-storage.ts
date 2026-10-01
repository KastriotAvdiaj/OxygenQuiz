/**
 * Whether this browser has been through the Associations first-play guide
 * (docs/quiz/associations.md §9.10). A per-viewer convenience, so browser storage and nothing
 * more: a player on a new device sees the guide once more and can dismiss it. `localStorage`
 * throws in some privacy modes, and any failure reads as "not seen" and writes nothing.
 */
const KEY = "oxygenquiz:associations:coach-seen";

export function hasSeenBoardCoach(): boolean {
  // In development (`npm run dev`) the guide shows on every new game, so it can be worked on
  // without clearing storage. Vite replaces the flag at build time; production never sees it.
  if (import.meta.env.DEV) return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markBoardCoachSeen(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // Not remembered — the guide shows again next time, which is harmless.
  }
}
