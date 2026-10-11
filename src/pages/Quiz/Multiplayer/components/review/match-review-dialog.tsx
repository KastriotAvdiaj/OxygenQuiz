import { useState } from "react";
import { ExternalLink, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BlobLoader } from "@/components/ui";
import { cn } from "@/utils/cn";
import { MatchPlayerTabs } from "@/pages/Quiz/Sessions/components/quiz-results/match-player-tabs";
import { QuestionReview } from "@/pages/Quiz/Sessions/components/quiz-results/question-review";
import { useGetSessionResults, useMatchPlayers } from "@/pages/Quiz/Sessions/api/get-quiz-session";
import { useLobbyMatches, type MatchSummary } from "../../api/matches";

interface MatchReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The lobby's room code — what the API finds its matches by. */
  roomCode: string;
  /** The viewer's account id: which player in each match is "you". */
  userId: string | undefined;
}

/**
 * The review of a lobby's matches, without leaving the lobby (docs/quiz/multiplayer.md §7.6).
 *
 * Three choices, top to bottom: which match (the newest first, and selected), whose answers
 * (yours first), then the questions. The lower two are the results page's own pieces —
 * `MatchPlayerTabs` and `QuestionReview` — fed the same two reads it uses, so a match reads the
 * same here as it does from the history page a week later.
 *
 * Everything comes from the API by room code, nothing from the match's events: a player who
 * dropped out and reconnected after the match ended opens this and finds it.
 */
export function MatchReviewDialog({ isOpen, onClose, roomCode, userId }: MatchReviewDialogProps) {
  const { data: matches, isLoading, isError } = useLobbyMatches({ roomCode, enabled: isOpen });
  // Null means "the newest" — so a match recorded while the dialog is open becomes the selection
  // only if the viewer hasn't picked one themselves.
  const [pickedMatchId, setPickedMatchId] = useState<string | null>(null);

  const newestFirst = [...(matches ?? [])].reverse();
  const match = newestFirst.find((m) => m.matchId === pickedMatchId) ?? newestFirst[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col gap-4 font-quiz">
        <DialogHeader>
          <DialogTitle>Match review</DialogTitle>
          <DialogDescription>
            Every match played in this lobby, and what each player answered.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <BlobLoader size="md" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Couldn&apos;t load this lobby&apos;s matches. Close this and try again.
          </p>
        ) : !match ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No finished match to review yet. A match you leave before the end isn&apos;t recorded.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <MatchPicker
              matches={newestFirst}
              total={newestFirst.length}
              value={match.matchId}
              onValueChange={setPickedMatchId}
              userId={userId}
            />
            {/* Keyed: a different match is a different set of players and answers, so the
                "whose answers" choice below starts over rather than pointing at a stale session. */}
            <MatchReview key={match.matchId} match={match} userId={userId} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Which match. Hidden while there is only one: a single tab is not a choice. */
function MatchPicker({
  matches,
  total,
  value,
  onValueChange,
  userId,
}: {
  matches: MatchSummary[];
  total: number;
  value: string;
  onValueChange: (matchId: string) => void;
  userId: string | undefined;
}) {
  if (matches.length < 2) return null;

  return (
    <div
      role="tablist"
      aria-label="Which match to review"
      className="mb-4 flex gap-2 overflow-x-auto pb-1"
    >
      {matches.map((m, index) => {
        const active = m.matchId === value;
        const won = m.players.some((p) => p.userId === userId && p.isWinner);
        return (
          <button
            key={m.matchId}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange(m.matchId)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary bg-primary/10 font-medium text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {won && <Trophy className="h-3.5 w-3.5 text-yellow-500" aria-label="You won" />}
            {/* Numbered in the order they were played, though listed newest first. */}
            <span>Match {total - index}</span>
            <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{m.quizTitle}</span>
          </button>
        );
      })}
    </div>
  );
}

function MatchReview({ match, userId }: { match: MatchSummary; userId: string | undefined }) {
  // The API only returns matches the viewer played in, so their own session is always here.
  const ownSessionId = match.players.find((p) => p.userId === userId)?.sessionId ?? "";
  const [reviewedSessionId, setReviewedSessionId] = useState(ownSessionId);

  const isClassic = match.format === "Classic";
  const { data: players } = useMatchPlayers({ sessionId: isClassic ? ownSessionId : "" });
  const reviewed = useGetSessionResults({
    sessionId: reviewedSessionId,
    enabled: isClassic && !!reviewedSessionId,
  });

  // A Duel's review is a board and a move log, not a list of questions, and it already has a
  // page of its own. Linked rather than embedded (decided 2026-10-11: Classic only in here for
  // now) — in a new tab, because following it in this one would leave the lobby.
  if (!isClassic) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        This match was an Associations duel.{" "}
        <a
          href={`/quiz/results/${ownSessionId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
        >
          Open its review
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </p>
    );
  }

  return (
    <>
      <MatchPlayerTabs
        players={players ?? []}
        value={reviewedSessionId}
        onValueChange={setReviewedSessionId}
        ownSessionId={ownSessionId}
      />
      {reviewed.data ? (
        <QuestionReview session={reviewed.data} />
      ) : reviewed.isError ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load that player&apos;s answers.</p>
      ) : (
        <div className="flex justify-center py-8">
          <BlobLoader size="md" />
        </div>
      )}
    </>
  );
}
