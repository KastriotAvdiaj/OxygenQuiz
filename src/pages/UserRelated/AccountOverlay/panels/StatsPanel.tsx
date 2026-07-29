import { Gamepad2, Trophy, Target, Timer } from "lucide-react";
import { useUser } from "@/lib/Auth";
import { useUserQuizStats } from "@/pages/UserRelated/Profile/api/get-user-quiz-stats";
import { QuizHistoryList } from "@/pages/UserRelated/Profile/components/QuizHistoryList";

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
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted-foreground" />
    </div>
    <p className="mt-1 text-xl font-bold">{value}</p>
    {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const points = (n?: number | null) =>
  n === undefined || n === null ? "—" : Math.round(n).toLocaleString();

/**
 * Play statistics and history inside the overlay. Reuses the same query hooks and the
 * same QuizHistoryList as the profile page — one implementation, two shells (the rule
 * docs/RESPONSIVE.md sets for sidebars/drawers applies just as well to panels).
 */
export const StatsPanel = () => {
  const { data: user } = useUser();
  const { data: stats } = useUserQuizStats(user?.id ?? "");

  return (
    <div className="space-y-6">
      {/* 2 columns at 360px is the most that stays legible; 4 once there's room. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Gamepad2}
          label="Played"
          value={stats?.quizzesPlayed ?? "—"}
          hint={
            stats ? `${stats.distinctQuizzesPlayed} different` : "Completed quizzes"
          }
        />
        <StatTile
          icon={Trophy}
          label="Avg. score"
          value={points(stats?.averageScore)}
          hint={stats ? `Best ${points(stats.bestScore)}` : undefined}
        />
        <StatTile
          icon={Target}
          label="Accuracy"
          value={stats ? `${stats.accuracyPercent}%` : "—"}
          hint={
            stats
              ? `${stats.totalCorrectAnswers}/${stats.totalQuestionsAnswered} correct`
              : undefined
          }
        />
        <StatTile
          icon={Timer}
          label="Avg. time"
          value={stats ? `${stats.averageAnswerTimeSeconds}s` : "—"}
          hint="Per question"
        />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Recent quizzes</h3>
        {user?.id ? (
          <QuizHistoryList userId={user.id} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sign in to see your history.
          </p>
        )}
      </section>
    </div>
  );
};
