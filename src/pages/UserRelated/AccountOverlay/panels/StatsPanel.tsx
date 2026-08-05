import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Target, Timer, Trophy } from "lucide-react";
import { useUser } from "@/lib/Auth";
import { LoadingWave } from "@/components/ui";
import { useUserQuizStats } from "@/pages/UserRelated/Profile/api/get-user-quiz-stats";
import type { UserQuizStats } from "@/types/quiz-session-types";
import formatDate from "@/lib/date-format";

const number = (n?: number | null) =>
  n === undefined || n === null ? "—" : Math.round(n).toLocaleString();

/**
 * A headline figure. Label above, value below — the value is what the eye should land on,
 * so it gets the size and the label stays quiet.
 */
const StatTile = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon size={14} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
      <span className="truncate text-xs font-medium">{label}</span>
    </div>
    <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{value}</p>
    {hint && (
      <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{hint}</p>
    )}
  </div>
);

/** One line of the secondary breakdown. */
const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-sm font-semibold tabular-nums">{value}</dd>
  </div>
);

const StatsContent = ({ stats }: { stats: UserQuizStats }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        icon={Gamepad2}
        label="Played"
        value={number(stats.quizzesPlayed)}
        hint={`${number(stats.distinctQuizzesPlayed)} different`}
      />
      <StatTile
        icon={Target}
        label="Accuracy"
        value={
          stats.totalQuestionsAnswered > 0 ? `${stats.accuracyPercent}%` : "—"
        }
        hint={`${number(stats.totalCorrectAnswers)} of ${number(stats.totalQuestionsAnswered)} correct`}
      />
      <StatTile
        icon={Trophy}
        label="Avg. score"
        value={number(stats.averageScore)}
        hint={`Best ${number(stats.bestScore)}`}
      />
      <StatTile
        icon={Timer}
        label="Avg. answer"
        value={`${number(stats.averageAnswerTimeSeconds)}s`}
        hint="Per question"
      />
    </div>

    {/* The finer numbers, as a definition list rather than more tiles — eight equal-weight
        boxes would flatten the hierarchy and none of these deserve headline treatment. */}
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Breakdown
      </h3>
      <dl className="divide-y divide-border">
        <DetailRow
          label="Questions answered"
          value={number(stats.totalQuestionsAnswered)}
        />
        <DetailRow
          label="Correct answers"
          value={number(stats.totalCorrectAnswers)}
        />
        <DetailRow label="Best score" value={number(stats.bestScore)} />
        {/* Abandoned sessions are tracked separately and kept out of the averages above
            — a half-finished quiz's score would drag them down. */}
        <DetailRow label="Abandoned" value={number(stats.quizzesAbandoned)} />
        <DetailRow
          label="Last played"
          value={stats.lastPlayedAt ? formatDate(stats.lastPlayedAt) : "—"}
        />
      </dl>
    </section>
  </div>
);

/**
 * Play statistics inside the account overlay.
 *
 * Stats only. The history list that used to sit under these numbers moved to
 * `/my-dashboard/history`: the overlay is something you open over your current page and
 * dismiss, so a paginated list you click into fought the format. The button below is a
 * plain `Link` to a different path, which drops the `?settings=` param and therefore closes
 * the overlay on its own — no explicit close call needed.
 */
export const StatsPanel = () => {
  const { data: user } = useUser();
  const { data: stats, isLoading } = useUserQuizStats(user?.id ?? "");

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingWave size="sm" />
        </div>
      ) : !stats ? (
        // The query sets `throwOnError: false` precisely so a missing or failing endpoint
        // degrades to a message here instead of taking the overlay down.
        <p className="py-12 text-center text-sm text-muted-foreground">
          Your stats couldn't be loaded right now.
        </p>
      ) : stats.quizzesPlayed === 0 ? (
        <div className="py-10 text-center">
          <p className="font-medium">No quizzes played yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your stats will appear here once you've finished a quiz.
          </p>
          <Link
            to="/choose-quiz"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Browse quizzes
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <StatsContent stats={stats} />
      )}

      {/* Shown even in the error and empty states — the history page stands on its own and
          is the only nav path to it from inside the overlay. */}
      <Link
        to="/my-dashboard/history"
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">View quiz history</span>
          <span className="block truncate text-xs text-muted-foreground">
            Every quiz you've played, with your answers
          </span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
};
