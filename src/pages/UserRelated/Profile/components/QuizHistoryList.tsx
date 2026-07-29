import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ChevronLeft, ChevronRight, Clock, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingWave } from "@/components/ui";
import { useUserSessions } from "@/pages/Quiz/Sessions/api/get-user-sessions";
import type { QuizSessionSummary } from "@/types/quiz-session-types";
import formatDate from "@/lib/date-format";

const PAGE_SIZE = 8;

/**
 * "HH:MM:SS" / "d.HH:MM:SS" (the .NET TimeSpan wire format) → a short human duration.
 * Returns null when the session never finished, so callers can hide the field.
 */
const formatDuration = (duration: string | null): string | null => {
  if (!duration) return null;

  const [clock] = duration.split(".").slice(-1);
  const parts = clock.split(":").map((p) => Math.floor(Number(p)));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;

  const [hours, minutes, seconds] = parts;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const statusBadge = (session: QuizSessionSummary) => {
  if (session.abandonmentReason != null)
    return <Badge variant="outline">Abandoned</Badge>;
  if (session.isCompleted) return <Badge variant="outline">Completed</Badge>;
  return <Badge variant="outline">In progress</Badge>;
};

const HistoryRow = ({ session }: { session: QuizSessionSummary }) => {
  const duration = formatDuration(session.duration);
  const accuracy =
    session.totalQuestions > 0
      ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
      : null;

  return (
    <Link
      to={`/quiz/results/${session.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 p-3 transition-colors hover:bg-foreground/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{session.quizTitle}</span>
          {statusBadge(session)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{formatDate(session.startTime)}</span>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {session.correctAnswers}/{session.totalQuestions}
            {accuracy !== null && ` (${accuracy}%)`}
          </span>
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-lg font-bold">{session.totalScore.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">points</div>
      </div>
    </Link>
  );
};

/**
 * Paginated play history for the signed-in user. Rows link to the existing results page, which
 * already renders the per-question review — no new detail view needed.
 */
export const QuizHistoryList = ({ userId }: { userId: string }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useUserSessions({
    userId,
    page,
    pageSize: PAGE_SIZE,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingWave size="sm" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Your history couldn't be loaded right now.
      </p>
    );
  }

  const sessions = data?.items ?? [];

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <Activity className="mb-3 h-8 w-8 opacity-50" />
        <p className="font-medium">No quizzes played yet</p>
        <p className="text-sm">Sessions you play will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {sessions.map((session) => (
          <HistoryRow key={session.id} session={session} />
        ))}
      </div>

      {(data!.hasPreviousPage || data!.hasNextPage) && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={!data!.hasPreviousPage}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {data!.page} of {data!.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data!.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
