import type { HostedGameView, HostedTeam, TeamColour } from "../api/hosted-games";

/**
 * Pure helpers for Host mode's screens (docs/quiz/classroom.md) — tested in
 * __tests__/hosted-model.test.ts. Nothing here decides a rule: the server's view does; these only
 * say it.
 */

/**
 * A Team's colour as complete class strings (CLAUDE.md: class strings stay literal). One quiet
 * accent per Team, loud only for whose turn it is — the colour schema's rule
 * (docs/quiz/question-type-color-schema.md): colour encodes identity quietly, state gets loud.
 */
export const TEAM_THEME: Record<TeamColour, { dot: string; text: string; active: string; soft: string }> = {
  red: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", active: "border-red-500 ring-2 ring-red-500/30", soft: "bg-red-500/10" },
  blue: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", active: "border-blue-500 ring-2 ring-blue-500/30", soft: "bg-blue-500/10" },
  green: { dot: "bg-green-500", text: "text-green-600 dark:text-green-400", active: "border-green-500 ring-2 ring-green-500/30", soft: "bg-green-500/10" },
  yellow: { dot: "bg-yellow-400", text: "text-yellow-700 dark:text-yellow-300", active: "border-yellow-400 ring-2 ring-yellow-400/30", soft: "bg-yellow-400/10" },
};

export type RankedTeam = HostedTeam & { rank: number; tied: boolean };

/** Teams by score, highest first. Equal scores share a rank and are marked tied — a tie is a tie (C12). */
export function rankTeams(teams: HostedTeam[]): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => b.score - a.score || a.seat - b.seat);
  return sorted.map((team) => {
    const rank = sorted.findIndex((t) => t.score === team.score) + 1;
    const tied = sorted.filter((t) => t.score === team.score).length > 1;
    return { ...team, rank, tied };
  });
}

/** The winning line for the end screen: "Blue wins", "Red and Blue share first place", or "". */
export function winnerLine(teams: HostedTeam[]): string {
  const ranked = rankTeams(teams).filter((t) => t.rank === 1);
  if (ranked.length === 0) return "";
  if (ranked.length === 1) return `${ranked[0].name} wins`;
  const names = ranked.map((t) => t.name);
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} share first place`;
}

/**
 * Splits students across `teamCount` Teams as evenly as possible, in a random order. `random` is
 * injectable for tests; the shuffle is Fisher–Yates.
 */
export function shuffleIntoTeams(students: string[], teamCount: number, random: () => number = Math.random): string[][] {
  const order = [...students];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  order.forEach((student, i) => teams[i % teamCount].push(student));
  return teams;
}

export function teamName(view: Pick<HostedGameView, "teams">, seat: number | null): string {
  return view.teams.find((t) => t.seat === seat)?.name ?? "";
}

/** What happens next, in one line, for both screens. */
export function hostedPrompt(view: HostedGameView): string {
  if (view.isOver) return "";
  const team = teamName(view, view.currentSeat);
  if (view.isPaused) return "Paused";
  if (view.canOpen) return `${team}: open a tile.`;
  if (view.inEndgame) {
    const left = view.teams.find((t) => t.seat === view.currentSeat)?.endgameTurnsLeft;
    return `${team}: guess a column or the final${left != null ? ` — ${left} ${left === 1 ? "turn" : "turns"} left after this` : ""}.`;
  }
  return `${team}: guess a column or the final — or pass.`;
}

/** Why the game ended, as the end screen says it. */
export function endLine(view: Pick<HostedGameView, "endReason">): string {
  switch (view.endReason) {
    case "FinalSolved":
      return "The final is solved";
    case "TimeUp":
      return "Time's up — the round is over";
    case "EndgameOver":
      return "Every team has had its last turns";
    case "EndedByHost":
      return "Game ended";
    case "Abandoned":
      return "This game was left unfinished";
    default:
      return "Game over";
  }
}

/** Seconds left on a clock: frozen while paused, else counted down to the server's deadline. */
export function clockMs(
  deadlineUtc: string | null,
  secondsLeftWhilePaused: number | null,
  serverNow: string,
  receivedAtMs: number,
  nowMs: number,
): number | null {
  if (secondsLeftWhilePaused != null) return secondsLeftWhilePaused * 1000;
  if (!deadlineUtc) return null;
  const offset = Date.parse(serverNow) - receivedAtMs;
  return Math.max(0, Date.parse(deadlineUtc) - (nowMs + offset));
}

/** The latest Guess, in words — what the room just heard said. */
export function lastGuessLine(view: HostedGameView): string | null {
  const cancelled = new Set(view.moves.filter((m) => m.kind === "Undo").map((m) => m.cancelsSeq));
  const last = [...view.moves].reverse().find((m) => m.kind === "Guess" && !cancelled.has(m.seq));
  if (!last) return null;
  const target = last.target === "Final" ? "the final" : `column ${last.target}`;
  return `${teamName(view, last.seat)} guessed “${last.guessText}” for ${target} — ${last.isCorrect ? `right, +${last.points}` : "wrong"}`;
}
