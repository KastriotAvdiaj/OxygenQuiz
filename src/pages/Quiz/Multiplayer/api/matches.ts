import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import type { PagedResponse } from "@/lib/filtering";
import { matchKeys } from "@/lib/query-keys";

/** One player's line in a played match — mirrors the API's `MatchSummaryPlayerDto`. */
export type MatchSummaryPlayer = {
  /** The session holding this player's answers: what a review loads. */
  sessionId: string;
  userId: string;
  username: string;
  profileImageUrl: string | null;
  totalScore: number;
  /** False for everyone on a tie. */
  isWinner: boolean;
};

/** One played match, as a line in a list — mirrors `MatchSummaryDto`. Players are highest score first. */
export type MatchSummary = {
  matchId: string;
  lobbyKey: string;
  roomCode: string;
  quizId: number;
  quizTitle: string;
  format: "Classic" | "Associations";
  startedAt: string;
  endedAt: string | null;
  players: MatchSummaryPlayer[];
};

/** One lobby in a player's history, its matches oldest first — mirrors `LobbyHistoryDto`. */
export type LobbyHistory = {
  lobbyKey: string;
  roomCode: string;
  startedAt: string;
  lastPlayedAt: string;
  matches: MatchSummary[];
};

/**
 * GET /api/matches/lobby/{roomCode} — the matches played so far in an open lobby that the caller
 * took part in, oldest first. 404 once the lobby is gone; the history page has them from then on.
 */
export const getLobbyMatches = ({ roomCode }: { roomCode: string }): Promise<MatchSummary[]> =>
  apiService.get(`/matches/lobby/${encodeURIComponent(roomCode)}`);

/**
 * The review's list of matches. Read from the database rather than kept from the match's own
 * events, which is what makes it survive a reconnect: come back to the lobby and ask again.
 * `use-match` invalidates it when the server announces `MatchRecorded`.
 */
export const useLobbyMatches = ({ roomCode, enabled = true }: { roomCode: string; enabled?: boolean }) =>
  useQuery({
    queryKey: matchKeys.lobby(roomCode),
    queryFn: () => getLobbyMatches({ roomCode }),
    enabled: !!roomCode && enabled,
    // The lobby count and the dialog degrade to "nothing yet" rather than taking the lobby down
    // with them (the app-wide default is to throw to the error boundary).
    throwOnError: false,
    retry: false,
  });

export const MY_LOBBIES_PAGE_SIZE = 20;

/** GET /api/matches/mine — the caller's multiplayer history, one entry per lobby, newest first. */
export const getMyLobbies = ({
  page,
  pageSize = MY_LOBBIES_PAGE_SIZE,
}: {
  page: number;
  pageSize?: number;
}): Promise<PagedResponse<LobbyHistory>> =>
  apiService.get(`/matches/mine?page=${page}&pageSize=${pageSize}`);

export const useMyLobbies = ({ page, pageSize = MY_LOBBIES_PAGE_SIZE }: { page: number; pageSize?: number }) =>
  useQuery({
    queryKey: matchKeys.mine(page, pageSize),
    queryFn: () => getMyLobbies({ page, pageSize }),
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
