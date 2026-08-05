import { History } from "lucide-react";
import { useUser } from "@/lib/Auth";
import { QuizHistoryList } from "@/pages/UserRelated/Profile/components/QuizHistoryList";

/**
 * `/my-dashboard/history` — the signed-in user's full play history.
 *
 * This is the destination for the "View quiz history" button in the account overlay's Quiz
 * Stats panel. The split is deliberate: the overlay is something you glance at and dismiss,
 * so it holds the aggregate numbers only, while history is a list you scroll, paginate and
 * click into — a workspace task, and the dashboard is the workspace.
 *
 * The list itself is the same `QuizHistoryList` the profile uses. It owns its own paging,
 * loading, empty and error states, and its rows link to the existing results page, which
 * already renders the per-question review — so there's no detail view to build here.
 */
export const MyQuizHistory = () => {
  const { data: user } = useUser();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <History className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
          Quiz History
        </h1>
        <p className="text-sm text-muted-foreground">
          Every quiz you've played. Select one to review your answers.
        </p>
      </header>

      {/* The route is behind `userAuthLoader`, so an absent user here means the profile
          request is still in flight rather than a signed-out visitor. */}
      {user?.id ? (
        <QuizHistoryList userId={user.id} />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Loading your history…
        </p>
      )}
    </div>
  );
};
