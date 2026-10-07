import { DEFAULT_TEAM_NAMES, HOSTED_LIMITS, TEAM_COLOURS, type StartHostedGameInput, type TeamColour } from "../api/hosted-games";
import { shuffleIntoTeams } from "./hosted-model";

/**
 * The Host setup form's state and its one rule-bearing function, `toStartInput` — kept pure so
 * it is tested (__tests__/setup-model.test.ts). The API is the rule; this keeps the form honest.
 */

export type DraftTeam = { name: string; colour: TeamColour; students: string[] };
export type Clocks = { timed: false } | { timed: true; minutes: number; turnSeconds: number };

export const freshTeams = (count: number): DraftTeam[] =>
  Array.from({ length: count }, (_, i) => ({ name: DEFAULT_TEAM_NAMES[i], colour: TEAM_COLOURS[i], students: [] }));

/** Changes the number of Teams, keeping names, and putting the students of a removed Team back in play. */
export function resizeTeams(teams: DraftTeam[], count: number): DraftTeam[] {
  if (count >= teams.length)
    return [...teams, ...freshTeams(count).slice(teams.length)];
  const kept = teams.slice(0, count).map((t) => ({ ...t, students: [...t.students] }));
  teams.slice(count).flatMap((t) => t.students).forEach((s, i) => kept[i % count].students.push(s));
  return kept;
}

/** Everyone in the Class, shuffled across the current Teams. */
export function shuffle(teams: DraftTeam[], students: string[], random?: () => number): DraftTeam[] {
  const split = shuffleIntoTeams(students, teams.length, random);
  return teams.map((t, i) => ({ ...t, students: split[i] }));
}

/** Moves one student (by index within its Team) to another Team. */
export function moveStudent(teams: DraftTeam[], from: number, index: number, to: number): DraftTeam[] {
  if (from === to) return teams;
  const next = teams.map((t) => ({ ...t, students: [...t.students] }));
  const [student] = next[from].students.splice(index, 1);
  if (student !== undefined) next[to].students.push(student);
  return next;
}

/**
 * The most Teams a setup can have. With no Class it's the API's 4; with one, never more Teams than
 * students — every Team of a Class game needs someone in it (docs/quiz/classroom.md, Setup).
 */
export const maxTeamsFor = (classSize: number | null): number =>
  classSize === null ? HOSTED_LIMITS.maxTeams : Math.min(HOSTED_LIMITS.maxTeams, classSize);

/**
 * The seats of Teams that can't start empty: none without a Class (Teams are just names), every
 * empty one with. The setup page marks these cards in place; `setupProblem` names the first.
 */
export const emptyTeamSeats = (teams: DraftTeam[], classSize: number | null): number[] =>
  classSize === null ? [] : teams.flatMap((t, seat) => (t.students.length === 0 ? [seat] : []));

/**
 * What's wrong with the form, or null when it can start.
 *
 * `ignoreEmptyTeams` leaves out the empty-Team problem, for a caller that already shows it on the
 * cards themselves and only wants what's left to say elsewhere.
 *
 * `classSize` is the picked Class's student count, or null for "No class". With a Class, no Team
 * may be empty: an empty Team would still take turns with nobody to play them. Without one, every
 * Team is just a name, which is fine.
 */
export function setupProblem(
  teams: DraftTeam[],
  clocks: Clocks,
  classSize: number | null = null,
  { ignoreEmptyTeams = false }: { ignoreEmptyTeams?: boolean } = {},
): string | null {
  const names = teams.map((t) => t.name.trim().toLowerCase() || "");
  if (teams.length < HOSTED_LIMITS.minTeams || teams.length > HOSTED_LIMITS.maxTeams) return "Pick 2 to 4 teams.";
  if (classSize !== null) {
    if (classSize < HOSTED_LIMITS.minTeams) return "This class needs at least 2 students to make teams.";
    if (teams.length > classSize) return `This class has ${classSize} students — pick ${classSize} teams or fewer.`;
    const empty = ignoreEmptyTeams ? -1 : emptyTeamSeats(teams, classSize)[0] ?? -1;
    if (empty !== -1)
      return `${teams[empty].name.trim() || DEFAULT_TEAM_NAMES[empty]} has no students — move someone there or pick fewer teams.`;
  }
  if (names.some((n) => n.length > HOSTED_LIMITS.teamName)) return `Team names are up to ${HOSTED_LIMITS.teamName} characters.`;
  if (new Set(names.filter(Boolean)).size !== names.filter(Boolean).length) return "Two teams have the same name.";
  if (clocks.timed && (clocks.minutes < HOSTED_LIMITS.minGameMinutes || clocks.minutes > HOSTED_LIMITS.maxGameMinutes))
    return `The game time is ${HOSTED_LIMITS.minGameMinutes} to ${HOSTED_LIMITS.maxGameMinutes} minutes.`;
  return null;
}

export function toStartInput(quizId: number, shareToken: string | null, teams: DraftTeam[], clocks: Clocks): StartHostedGameInput {
  return {
    quizId,
    shareToken,
    teams: teams.map((t, i) => ({ name: t.name.trim() || DEFAULT_TEAM_NAMES[i], colour: t.colour, students: t.students })),
    gameSeconds: clocks.timed ? clocks.minutes * 60 : null,
    turnSeconds: clocks.timed ? clocks.turnSeconds : null,
  };
}
