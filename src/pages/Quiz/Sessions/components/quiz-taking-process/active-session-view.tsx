import { Loader2, Play, RotateCcw, Clock, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

/** The slice of QuizSession this screen actually reads. Kept structural rather than
 *  importing QuizSession so a story can hand it a literal without inventing scores,
 *  ids and answer payloads it never renders. */
export interface ActiveSessionSummary {
  userAnswers: unknown[];
  totalQuestions: number;
  startTime: string;
  quizTitle: string;
}

export interface ActiveSessionViewProps {
  session: ActiveSessionSummary;
  onResume: () => void;
  onRestart: () => void;
  onGoBack: () => void;
  /** Resume and Start Fresh both hit the backend; while either is in flight every button
   *  is disabled and both show a spinner (the screen doesn't track which one you pressed). */
  isLoading: boolean;
}

/**
 * Shown when the user opens a quiz they already have an unfinished session for.
 * Offers "Resume" (backend catch-up: expired questions are auto-timed-out) or
 * "Start Fresh" (abandon + create a new session).
 *
 * Presentational on purpose — QuizPage decides when it appears, this file decides how it
 * looks, which is what lets active-session-view.stories.tsx render it with no live session.
 *
 * flex-1 rather than h-screen: see docs/RESPONSIVE.md.
 */
export const ActiveSessionView = ({
  session,
  onResume,
  onRestart,
  onGoBack,
  isLoading,
}: ActiveSessionViewProps) => {
  const answeredCount = session.userAnswers?.length ?? 0;
  const totalQuestions = session.totalQuestions;
  const startedAgo = getRelativeTime(session.startTime);

  return (
    <div
      className="flex flex-1 w-full items-center justify-center px-4 py-6"
      style={{
        background: `
          radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
          hsl(var(--background))
        `,
      }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-primary/10 border border-primary/20">
            <Clock className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight">
            Session In Progress
          </h2>
          <p className="text-muted-foreground text-sm">
            You have an active session for{" "}
            <span className="font-medium text-foreground">{session.quizTitle}</span>
          </p>
        </div>

        {/* Session Info Card */}
        <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-5 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">
              {answeredCount} / {totalQuestions} questions
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{
                width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
              }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Started</span>
            <span className="font-medium">{startedAgo}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={onResume}
            disabled={isLoading}
            size="lg"
            className="w-full text-base font-semibold gap-2"
            variant="fancy">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            Resume Quiz
          </Button>

          <Button
            onClick={onRestart}
            disabled={isLoading}
            size="lg"
            variant="outline"
            className="w-full text-base gap-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RotateCcw className="h-5 w-5" />
            )}
            Start Fresh
          </Button>

          <Button
            onClick={onGoBack}
            variant="ghost"
            size="sm"
            className="w-full text-base gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back to Quiz Selection
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

/** "just now" / "12 min ago" / "3h ago" / "2d ago". Kept module-local: exporting a
 *  non-component from a component file breaks React Fast Refresh (eslint
 *  react-refresh/only-export-components). Stories build their startTime relative to
 *  Date.now() instead of hard-coding a date that ages into "412d ago". */
function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
