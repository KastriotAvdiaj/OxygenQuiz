import type { AssociationEndReason, AssociationMoveView, DuelView } from "@/types/association-types";
import { targetLabel, tileLabel } from "../board/board-model";

// Pure helpers for the Duel screen — derived from the server's view during render (CLAUDE.md:
// derive, don't store). The rules are the server's; these say them from where the reader sits.
// Behaviour: docs/quiz/associations.md §3.3, §10.

/** The seats, winner and ending — what both the live Duel view and a Duel's review carry. */
type DuelResult = Pick<DuelView, "seats" | "winnerSeat" | "endReason">;

/** How a Duel ended, said neutrally — Solo's END_REASON_TEXT is written to the one player. */
export const DUEL_END_REASON_TEXT: Partial<Record<AssociationEndReason, string>> = {
  FinalSolved: "The final solution was found",
  EndgameOver: "The endgame ran out",
  Forfeit: "Forfeited",
};

const nameOf = (view: Pick<DuelView, "seats">, seat: number) => view.seats.find((s) => s.seat === seat)?.username ?? "Your opponent";

/** The reader's Seat, or null for someone watching. Usernames compare case-insensitively, as on the server. */
export function mySeatIn(view: DuelView, username: string): number | null {
  const lower = username.toLowerCase();
  return view.seats.find((s) => s.username.toLowerCase() === lower)?.seat ?? null;
}

/** One sentence: whose turn, and what it allows. Null once the Duel is over. */
export function turnPrompt(view: DuelView, mySeat: number | null): string | null {
  if (view.isOver || view.currentSeat === null) return null;
  if (view.currentSeat !== mySeat) return `${nameOf(view, view.currentSeat)}'s turn.`;

  if (view.canOpen) return "Your turn — open a tile.";
  if (view.inEndgame) {
    const left = view.seats.find((s) => s.seat === mySeat)?.endgameTurnsLeft ?? 0;
    return left > 0
      ? `Every tile is open — guess or pass. ${left} more ${left === 1 ? "turn" : "turns"} after this one.`
      : "Every tile is open — guess or pass. This is your last turn.";
  }
  return "Type a guess into any column or the final — or pass.";
}

/** The headline once it's over, from the reader's side. */
export function duelOutcome(view: DuelResult, mySeat: number | null): string {
  if (view.winnerSeat === null) return "A tie";
  if (view.endReason === "Forfeit" && view.winnerSeat === mySeat) {
    const leaver = view.seats.find((s) => s.seat !== mySeat);
    return `${leaver?.username ?? "Your opponent"} left — you win`;
  }
  return view.winnerSeat === mySeat ? "You won" : `${nameOf(view, view.winnerSeat)} won`;
}

/** One line of the Duel's move log. The opponent's wrong Guesses are shown too (D15). */
export function describeDuelMove(view: Pick<DuelView, "seats" | "columns">, move: AssociationMoveView): string {
  const who = nameOf(view, move.seat);
  switch (move.kind) {
    case "OpenTile":
      return `${who} opened ${move.tileId != null ? tileLabel(view, move.tileId) : "a tile"}`;
    case "Guess": {
      const target = move.target ? targetLabel(move.target) : "a solution";
      return `${who} guessed “${move.guessText ?? ""}” for ${target} — ${move.isCorrect ? `right, +${move.points}` : "wrong"}`;
    }
    case "Pass":
      return `${who} passed`;
    case "TurnExpired":
      return `${who} ran out of time`;
    case "GiveUp":
      return `${who} gave up`;
  }
}
