import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import formatDate from "@/lib/date-format";
import type { QuizSessionSummary } from "@/types/quiz-session-types";
import { sessionResultsPath } from "@/pages/Quiz/quiz-play-path";

/** An Associations board has no questions to count — its points say how it went. */
const isBoard = (session: QuizSessionSummary) => session.format === "Associations";

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

/**
 * The headline score: share of the session's questions answered correctly, on a /100 scale —
 * the same number the results page shows as "Final Score" (`normalizedScore` in
 * quiz-session-utils.ts), so a row and the page it links to never disagree. Raw points are a
 * different thing (1000 base + speed bonus × point-system multiplier per correct answer, see
 * QuizScoring.cs) and run into five digits, which reads as noise next to a quiz title; they get
 * their own column. Null when there is nothing to score against.
 */
export const sessionScore = (session: QuizSessionSummary): number | null =>
  !isBoard(session) && session.totalQuestions > 0
    ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
    : null;

const StatusBadge = ({ session }: { session: QuizSessionSummary }) => {
  // Abandoned first: abandoned sessions are also IsCompleted = true server-side.
  if (session.abandonmentReason != null)
    return (
      <Badge
        variant="outline"
        className="border-destructive bg-destructive text-destructive-foreground"
      >
        Abandoned
      </Badge>
    );
  // Finished states are filled; in-progress stays outlined — it isn't a result yet.
  if (session.isCompleted)
    return (
      <Badge
        variant="outline"
        className="border-primary bg-primary text-primary-foreground"
      >
        Completed
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-primary/40 text-primary">
      In progress
    </Badge>
  );
};

const ScoreCell = ({
  session,
  compact,
}: {
  session: QuizSessionSummary;
  compact: boolean;
}) => {
  const score = sessionScore(session);
  // An in-progress play has no score yet — 2 of 8 so far is not "25", it is unfinished.
  // Abandoned plays are final, so they keep theirs.
  const unfinished = !session.isCompleted && session.abandonmentReason == null;
  if (score === null || unfinished) return <span className="text-muted-foreground">—</span>;

  // Compact: number and bar side by side, one line tall instead of two.
  if (compact)
    return (
      <div className="flex items-center gap-2.5">
        <span className="w-12 whitespace-nowrap tabular-nums">
          <span className="font-semibold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </span>
        <div className="h-1 w-14 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
        </div>
      </div>
    );

  return (
    <div className="flex min-w-[88px] flex-col gap-1">
      <span className="tabular-nums">
        <span className="text-base font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground"> / 100</span>
      </span>
      {/* A thin bar makes a column of scores scannable at a glance. */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

/**
 * Play-history columns. `meta.priority` decides which leave first as the table's container
 * narrows (docs/adr/0010-a-narrow-table-drops-columns-it-does-not-scroll.md) — this table also
 * renders on the profile page, which is narrower than the dashboard.
 *
 * - **1 — Quiz, Score, review link.** Which play it was and how it went; that is what the page
 *   is opened for, and the link is the only way into the per-question review.
 * - **2 — Played, Correct, Status.** When, the raw correct/total behind the score, and whether
 *   it finished — what you scan to find one play among several of the same quiz.
 * - **3 — Points, Duration.** Raw points (with speed bonus) and time taken: detail for a play
 *   you have already found.
 *
 * Sorting is server-side from the toolbar (the whole history, not just this page), so headers
 * are plain labels.
 */
export const quizHistoryColumns: ColumnDef<QuizSessionSummary>[] = [
  {
    id: "quiz",
    header: "Quiz",
    meta: { priority: 1 },
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        <Link
          to={sessionResultsPath(row.original)}
          className="font-medium text-foreground hover:text-primary hover:underline underline-offset-4"
        >
          {row.original.quizTitle}
        </Link>
        {isBoard(row.original) && <Badge variant="secondary">Board</Badge>}
      </span>
    ),
  },
  {
    id: "score",
    header: "Score",
    meta: { priority: 1 },
    cell: ({ row, table }) => (
      <ScoreCell
        session={row.original}
        compact={table.options.meta?.density === "compact"}
      />
    ),
  },
  {
    id: "played",
    header: "Played",
    meta: { priority: 2 },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDate(row.original.startTime)}
      </span>
    ),
  },
  {
    id: "correct",
    header: "Correct",
    meta: { priority: 2 },
    cell: ({ row }) =>
      !isBoard(row.original) && row.original.totalQuestions > 0 ? (
        <span className="tabular-nums">
          {row.original.correctAnswers}/{row.original.totalQuestions}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "status",
    header: "Status",
    meta: { priority: 2 },
    cell: ({ row }) => <StatusBadge session={row.original} />,
  },
  {
    id: "points",
    header: "Points",
    meta: { priority: 3 },
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {row.original.totalScore.toLocaleString()}
        <span className="text-xs text-muted-foreground"> pts</span>
      </span>
    ),
  },
  {
    id: "duration",
    header: "Duration",
    meta: { priority: 3 },
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
        {formatDuration(row.original.duration) ?? "—"}
      </span>
    ),
  },
  {
    id: "review",
    header: () => <span className="sr-only">Review</span>,
    meta: { priority: 1 },
    cell: ({ row }) => (
      <Link
        to={sessionResultsPath(row.original)}
        aria-label={`Review ${row.original.quizTitle}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    ),
  },
];
