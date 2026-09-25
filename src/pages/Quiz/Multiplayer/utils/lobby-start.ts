import type { SelectedQuiz } from "@/types/quiz-types";

type Player = { username: string; isReady: boolean };

/** Players in a Duel. Mirrors AssociationMatchOrchestrator.StartMatchAsync's check (D4: 1v1). */
export const DUEL_PLAYERS = 2;

/** An Associations pick is played as a Duel (docs/quiz/associations.md §10.1). */
export const isDuelPick = (quiz: SelectedQuiz | null | undefined): boolean => quiz?.format === "Associations";

/**
 * Why the host can't start yet, or null when they can. The lobby's one copy of the rule: the Start
 * button's `canStartQuiz` is "host and this is null", and the sentence under the button is this.
 * Client-side feedback only — the server re-checks the pick and the count
 * (docs/quiz/multiplayer.md §4.3).
 */
export function startBlockedReason({
  participants,
  selectedQuiz,
}: {
  participants: Player[];
  selectedQuiz: SelectedQuiz | null;
}): string | null {
  if (!selectedQuiz) return "Pick a quiz to get started";

  const count = participants.length;
  if (isDuelPick(selectedQuiz)) {
    if (count < DUEL_PLAYERS) return "Waiting for an opponent…";
    if (count > DUEL_PLAYERS) {
      const extra = count - DUEL_PLAYERS;
      return `A board is a duel for exactly ${DUEL_PLAYERS} players — ${extra === 1 ? "one" : extra} too many in the room.`;
    }
  } else if (count < 2) {
    return "Waiting for more players…";
  }

  const notReady = participants.filter((p) => !p.isReady).length;
  if (notReady > 0) return `Waiting for ${notReady} ${notReady === 1 ? "player" : "players"} to ready up…`;
  return null;
}
