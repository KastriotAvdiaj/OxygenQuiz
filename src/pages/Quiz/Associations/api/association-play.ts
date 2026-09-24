import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import type {
  AssociationGameView,
  AssociationMoveResult,
  GuessTarget,
} from "@/types/association-types";

// Solo play of an Associations Board — `api/associations/sessions` (AssociationSessionsController).
// Behaviour: docs/quiz/associations.md, "Playing".
//
// Every response carries the whole new view, so a move never invalidates and refetches: it
// writes what the server returned into the game's cache entry, and the board re-renders from it.

export const associationGameKeys = {
  all: ["associationGames"] as const,
  detail: (sessionId: string) => [...associationGameKeys.all, sessionId] as const,
};

const base = "/associations/sessions";

export const startAssociationGame = (quizId: number, shareToken?: string) =>
  apiService.post<AssociationGameView>(base, { quizId, shareToken });

export const getAssociationGame = (sessionId: string) =>
  apiService.get<AssociationGameView>(`${base}/${sessionId}`);

export const openAssociationTile = (sessionId: string, tileId: number) =>
  apiService.post<AssociationMoveResult>(`${base}/${sessionId}/open`, { tileId });

export const guessAssociation = (sessionId: string, target: GuessTarget, text: string) =>
  apiService.post<AssociationMoveResult>(`${base}/${sessionId}/guess`, { target, text });

export const giveUpAssociationGame = (sessionId: string) =>
  apiService.post<AssociationGameView>(`${base}/${sessionId}/give-up`);

export const restartAssociationGame = (sessionId: string, shareToken?: string) =>
  apiService.post<AssociationGameView>(`${base}/${sessionId}/restart`, { shareToken });

/**
 * The game as it stands. The server settles a game whose clock has run out when it is read, so
 * refetching at the deadline is how the page learns the game ended as TimeUp.
 */
export const useAssociationGame = (sessionId: string | undefined) =>
  useQuery({
    queryKey: associationGameKeys.detail(sessionId ?? ""),
    queryFn: () => getAssociationGame(sessionId!),
    enabled: !!sessionId,
    // A game changes only through this page's own moves, which write the cache directly.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

/** The three moves. Each writes the returned view into the game's cache entry. */
export const useAssociationMoves = (sessionId: string) => {
  const queryClient = useQueryClient();
  const store = (view: AssociationGameView) =>
    queryClient.setQueryData(associationGameKeys.detail(sessionId), view);

  const open = useMutation({
    mutationFn: (tileId: number) => openAssociationTile(sessionId, tileId),
    onSuccess: (result) => store(result.game),
  });

  const guess = useMutation({
    mutationFn: ({ target, text }: { target: GuessTarget; text: string }) =>
      guessAssociation(sessionId, target, text),
    onSuccess: (result) => store(result.game),
  });

  const giveUp = useMutation({
    mutationFn: () => giveUpAssociationGame(sessionId),
    onSuccess: store,
  });

  return { open, guess, giveUp };
};
