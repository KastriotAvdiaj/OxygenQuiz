import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { classroomKeys } from "@/lib/query-keys";
import type {
  AssociationColumnView,
  AssociationEndReason,
  AssociationFinalView,
  AssociationMoveView,
  GuessTarget,
} from "@/types/association-types";

/**
 * Host mode (docs/quiz/classroom.md). Mirrors DTOs/Classroom/HostedGameDTOs.cs. The Controller
 * reads and moves over REST; Displays only listen, over HostedGameHub (use-hosted-game-hub.ts).
 */

export type TeamColour = "red" | "blue" | "green" | "yellow";
export const TEAM_COLOURS: TeamColour[] = ["red", "blue", "green", "yellow"];
export const DEFAULT_TEAM_NAMES = ["Red", "Blue", "Green", "Yellow"];

/** Mirrors HostedGameService: the API is the rule, these keep the setup form honest. */
export const HOSTED_LIMITS = {
  minTeams: 2,
  maxTeams: 4,
  teamName: 30,
  minGameMinutes: 5,
  maxGameMinutes: 60,
  turnSeconds: [30, 60, 90, 120] as const,
};

export type HostedTeam = {
  seat: number;
  name: string;
  colour: TeamColour;
  students: string[];
  score: number;
  endgameTurnsLeft: number | null;
};

export type HostedGameView = {
  id: string;
  quizId: number;
  quizTitle: string;
  teams: HostedTeam[];
  firstSeat: number;
  currentSeat: number | null;
  canOpen: boolean;
  canGuess: boolean;
  canPass: boolean;
  inEndgame: boolean;
  isOver: boolean;
  endReason: AssociationEndReason | null;
  timed: boolean;
  gameSeconds: number | null;
  turnSeconds: number | null;
  gameDeadlineUtc: string | null;
  turnDeadlineUtc: string | null;
  isPaused: boolean;
  gameSecondsLeft: number | null;
  turnSecondsLeft: number | null;
  lastRound: boolean;
  serverNow: string;
  columns: AssociationColumnView[];
  final: AssociationFinalView;
  moves: AssociationMoveView[];
  // Controller only — never on a Display's view.
  undoLabel: string | null;
  screenCode: string | null;
  displaysConnected: number;
  answerKey: { target: GuessTarget; solution: string }[] | null;
};

export type HostedMoveResult = { game: HostedGameView; isCorrect: boolean | null; points: number };

export type HostedGameSummary = {
  id: string;
  quizId: number;
  quizTitle: string;
  startedAt: string;
  endedAt: string | null;
  isOver: boolean;
  isPaused: boolean;
  endReason: AssociationEndReason | null;
  teams: HostedTeam[];
};

export type StartHostedGameInput = {
  quizId: number;
  shareToken?: string | null;
  teams: { name: string; colour: TeamColour; students: string[] }[];
  gameSeconds: number | null;
  turnSeconds: number | null;
};

const base = (id: string) => `/hosted-games/${id}`;

export const startHostedGame = async (input: StartHostedGameInput) =>
  (await api.post("/hosted-games", input)).data as HostedGameView;

export const getHostedGame = async (id: string) => (await api.get(base(id))).data as HostedGameView;

export const useHostedGame = (id: string) =>
  useQuery({
    queryKey: classroomKeys.hostedGame(id),
    queryFn: () => getHostedGame(id),
    enabled: !!id,
  });

export const useHostedGames = () =>
  useQuery({
    queryKey: classroomKeys.hostedGames(),
    queryFn: async () => (await api.get("/hosted-games")).data as HostedGameSummary[],
  });

export const useStartHostedGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startHostedGame,
    onSuccess: (view) => {
      queryClient.setQueryData(classroomKeys.hostedGame(view.id), view);
      queryClient.invalidateQueries({ queryKey: classroomKeys.hostedGames() });
    },
  });
};

const postMove = async (url: string, body?: object) => (await api.post(url, body)).data as HostedMoveResult;
const postAction = async (url: string) => (await api.post(url)).data as HostedGameView;

/**
 * Every Controller action. Each answer carries the whole new view, written straight into the
 * cache — nothing is refetched after a move (the play stack's rule, quiz-playing-architecture.md).
 */
export const useHostedActions = (id: string) => {
  const queryClient = useQueryClient();
  const put = (view: HostedGameView) => queryClient.setQueryData(classroomKeys.hostedGame(view.id), view);
  const putMove = (result: HostedMoveResult) => put(result.game);

  const open = useMutation({
    mutationFn: (tileId: number) => postMove(`${base(id)}/open`, { tileId }),
    onSuccess: putMove,
  });
  const guess = useMutation({
    mutationFn: ({ target, text }: { target: GuessTarget; text: string }) =>
      postMove(`${base(id)}/guess`, { target, text }),
    onSuccess: putMove,
  });
  const pass = useMutation({ mutationFn: () => postMove(`${base(id)}/pass`), onSuccess: putMove });
  const undo = useMutation({ mutationFn: () => postAction(`${base(id)}/undo`), onSuccess: put });
  const pause = useMutation({ mutationFn: () => postAction(`${base(id)}/pause`), onSuccess: put });
  const resume = useMutation({ mutationFn: () => postAction(`${base(id)}/resume`), onSuccess: put });
  const end = useMutation({ mutationFn: () => postAction(`${base(id)}/end`), onSuccess: put });
  const screenCode = useMutation({ mutationFn: () => postAction(`${base(id)}/screen-code`), onSuccess: put });
  const disconnectScreens = useMutation({
    mutationFn: async () => (await api.delete(`${base(id)}/screens`)).data as HostedGameView,
    onSuccess: put,
  });
  const again = useMutation({
    mutationFn: async (quizId?: number) =>
      (await api.post(`${base(id)}/again`, { quizId: quizId ?? null })).data as HostedGameView,
    onSuccess: (view) => {
      put(view);
      queryClient.invalidateQueries({ queryKey: classroomKeys.hostedGames() });
    },
  });

  return { open, guess, pass, undo, pause, resume, end, screenCode, disconnectScreens, again };
};
