import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Trophy, Users } from "lucide-react";
import { BlobLoader } from "@/components/ui";
import { PaginationControls } from "@/components/ui/pagination-control";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import formatDate from "@/lib/date-format";
import { cn } from "@/utils/cn";
import {
  useMyLobbies,
  type LobbyHistory,
  type MatchSummary,
} from "@/pages/Quiz/Multiplayer/api/matches";

/**
 * The Multiplayer tab of `/my-dashboard/history`: one row per lobby, not per match
 * (docs/quiz/user-stats-history.md § "Two tabs").
 *
 * An evening of five rematches used to be five history rows that looked like five unrelated
 * plays. Here it is one row — when, which quiz, who with, how many matches, how many of them you
 * won — that opens into its matches, each linking to the results page that already reviews it.
 *
 * Everything a row shows is derived from the lobby's own `matches`, so the summary line and the
 * list under it cannot disagree.
 */
export const MultiplayerHistory = ({ userId }: { userId: string }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useMyLobbies({ page });
  const lobbies = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <BlobLoader size="sm" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Your multiplayer history couldn&apos;t be loaded right now.
      </p>
    );
  }

  if (lobbies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <Users className="mb-3 h-8 w-8 opacity-50" />
        <p className="font-medium">No multiplayer matches yet</p>
        <p className="mt-1 text-sm">Matches you finish in a lobby show up here, grouped by lobby.</p>
      </div>
    );
  }

  return (
    <>
      <ul
        className={cn(
          "divide-y divide-border rounded-lg border border-border transition-opacity",
          isPlaceholderData && "opacity-60",
        )}
      >
        {lobbies.map((lobby) => (
          <LobbyRow key={lobby.lobbyKey} lobby={lobby} userId={userId} />
        ))}
      </ul>

      {/* The app's standard pagination; it hides itself when there is only one page. */}
      <PaginationControls
        pagination={data ? pagedResponseToPagination(data) : undefined}
        onPageChange={setPage}
      />
    </>
  );
};

/** What happened to the viewer in one match. A tie has no winner, so nobody "lost" it. */
const outcomeOf = (match: MatchSummary, userId: string): "Won" | "Lost" | "Tie" => {
  if (!match.players.some((p) => p.isWinner)) return "Tie";
  return match.players.some((p) => p.userId === userId && p.isWinner) ? "Won" : "Lost";
};

const LobbyRow = ({ lobby, userId }: { lobby: LobbyHistory; userId: string }) => {
  const [open, setOpen] = useState(false);
  const { matches } = lobby;

  const wins = matches.filter((m) => outcomeOf(m, userId) === "Won").length;
  const quizTitles = [...new Set(matches.map((m) => m.quizTitle))];
  // Everyone the viewer played against here, across all of the lobby's matches.
  const others = [
    ...new Set(matches.flatMap((m) => m.players).filter((p) => p.userId !== userId).map((p) => p.username)),
  ];
  const panelId = `lobby-${lobby.lobbyKey}`;

  return (
    <li className="bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {quizTitles.length === 1 ? quizTitles[0] : `${quizTitles.length} quizzes`}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDate(lobby.lastPlayedAt)}
            {others.length > 0 && <> · with {others.join(", ")}</>}
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {matches.length} {matches.length === 1 ? "match" : "matches"}
        </span>
        <span className="flex w-16 shrink-0 items-center justify-end gap-1 text-sm font-semibold tabular-nums">
          <Trophy className="h-3.5 w-3.5 text-yellow-500" aria-hidden />
          {wins}
          <span className="sr-only">{wins === 1 ? "win" : "wins"}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <ol id={panelId} className="space-y-1 border-t border-border bg-muted/30 px-4 py-3">
          {matches.map((match, index) => {
            const mine = match.players.find((p) => p.userId === userId);
            const outcome = outcomeOf(match, userId);
            return (
              <li key={match.matchId} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-muted-foreground">Match {index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{match.quizTitle}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {(mine?.totalScore ?? 0).toLocaleString()} pts
                </span>
                <span
                  className={cn(
                    "w-10 shrink-0 text-right font-medium",
                    outcome === "Won" && "text-emerald-600 dark:text-emerald-400",
                    outcome === "Tie" && "text-muted-foreground",
                  )}
                >
                  {outcome}
                </span>
                {mine && (
                  // The existing results page: per-question review for a Classic match, with
                  // every player's answers; the board and move log for a duel.
                  <Link
                    to={`/quiz/results/${mine.sessionId}`}
                    className="shrink-0 font-medium text-primary underline underline-offset-4"
                  >
                    Review
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
};
