import { Loader2, Play, RotateCcw, Clock, ArrowLeft, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { SessionResumeState } from "@/types/quiz-session-types";
import { useResumeProjection } from "./resume-projection";

/** The slice of QuizSession this screen actually reads. Kept structural rather than
 *  importing QuizSession so a story can hand it a literal without inventing scores,
 *  ids and answer payloads it never renders. */
export interface ActiveSessionSummary {
  userAnswers: unknown[];
  totalQuestions: number;
  startTime: string;
  quizTitle: string;
  /** The session's live clock. Absent (older payload, or a completed session) degrades this
   *  screen to the static snapshot it used to be — no countdown, no skipped tally. */
  resumeState?: SessionResumeState | null;
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

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Shown when the user opens a quiz they already have an unfinished session for.
 * Offers "Resume" (backend catch-up: expired questions are auto-timed-out) or
 * "Start Fresh" (abandon + create a new session).
 *
 * THE CLOCK DOES NOT STOP HERE. Walking away mid-question and coming back to this screen used
 * to show a frozen "5 / 12" while the server went on counting, so the player pressed Resume
 * expecting question 6 and landed on question 9 with no explanation. The screen now replays the
 * backend's catch-up locally once a second (`resume-projection.ts`): the question in flight
 * counts down, and when it runs out the tally moves and the countdown rolls onto the next
 * question's window. Full reasoning in docs/quiz/session-resume-screen.md.
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

  const projection = useResumeProjection(session.resumeState, answeredCount);

  // What the player would actually be left with if they pressed Resume this second: the
  // questions they answered plus the ones that ran out while they were away.
  const skippedCount = projection?.skippedCount ?? 0;
  const resolvedCount = Math.min(totalQuestions, answeredCount + skippedCount);
  const isSpent = projection?.isComplete ?? false;

  // A countdown only when the server has a question in flight — see ResumeProjection.
  const countdown =
    projection && projection.nextChangeAtMs !== null && projection.secondsRemaining !== null
      ? {
          secondsLeft: projection.secondsRemaining,
          timeLimit: projection.timeLimitInSeconds ?? projection.secondsRemaining,
          questionNumber: projection.landingQuestionNumber,
        }
      : null;

  const answeredPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const skippedPct = totalQuestions > 0 ? (skippedCount / totalQuestions) * 100 : 0;

  return (
    <div className="flex flex-1 w-full items-center justify-center bg-background px-4 py-6">
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
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border ${
              isSpent
                ? "bg-quiz-error/10 border-quiz-error/20"
                : "bg-primary/10 border-primary/20"
            }`}>
            {isSpent ? (
              <Trophy className="w-8 h-8 text-quiz-error" />
            ) : (
              <Clock className="w-8 h-8 text-primary" />
            )}
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isSpent ? "Time's Up" : "Session In Progress"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isSpent ? (
              <>
                Every question in{" "}
                <span className="font-medium text-foreground">{session.quizTitle}</span> ran out
                while you were away.
              </>
            ) : (
              <>
                You have an active session for{" "}
                <span className="font-medium text-foreground">{session.quizTitle}</span>
              </>
            )}
          </p>
        </div>

        {/* Session Info Card */}
        <div className="rounded-xl border bg-card/50 p-5 space-y-4">
          {countdown && (
            <LiveQuestionClock
              secondsLeft={countdown.secondsLeft}
              timeLimit={countdown.timeLimit}
              questionNumber={countdown.questionNumber}
              totalQuestions={totalQuestions}
            />
          )}

          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold tabular-nums">
              {resolvedCount} / {totalQuestions} questions
            </span>
          </div>

          {/* Progress bar. Two segments, because "done" and "gone" are not the same thing:
              answered questions are worth points, questions that ran out are worth zero and
              the player can no longer do anything about them. */}
          <div className="flex w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${answeredPct}%` }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            />
            <motion.div
              className="h-full bg-quiz-error"
              initial={{ width: 0 }}
              animate={{ width: `${skippedPct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {skippedCount > 0 && (
            <p className="text-xs text-quiz-error">
              {skippedCount === 1
                ? "1 question ran out while you were away and scores 0."
                : `${skippedCount} questions ran out while you were away and score 0.`}
            </p>
          )}

          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Started</span>
            <span className="font-medium">{startedAgo}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onResume}
            disabled={isLoading}
            size="lg"
            className="w-full text-base font-semibold gap-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSpent ? (
              <Trophy className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            {isSpent ? "See Results" : "Resume Quiz"}
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

/**
 * The question that is still running, and how long is left of it.
 *
 * Deliberately NOT `QuizTimer`. That component owns its own anchored deadline and calls
 * `onTimeUp` — pointed at this screen it would be a second clock racing the projection, and the
 * two would disagree the moment either was throttled. Here the projection is the clock and this
 * is a readout of it, so the ring is drawn from the numbers it is handed and counts nothing.
 */
const LiveQuestionClock = ({
  secondsLeft,
  timeLimit,
  questionNumber,
  totalQuestions,
}: {
  secondsLeft: number;
  timeLimit: number;
  questionNumber: number | null;
  totalQuestions: number;
}) => {
  const fraction = timeLimit > 0 ? Math.min(1, Math.max(0, secondsLeft / timeLimit)) : 0;
  const offset = CIRCUMFERENCE - CIRCUMFERENCE * fraction;
  // Same thresholds QuizTimer uses, so a question looks equally urgent on both screens.
  const isCritical = fraction < 0.1;
  const isLow = fraction < 0.25;
  const ringClass = isCritical
    ? "text-quiz-error"
    : isLow
      ? "text-quiz-warning"
      : "text-primary";

  return (
    <div className="flex items-center gap-4 pb-4 border-b">
      <div className="relative h-16 w-16 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            strokeWidth={8}
            className="stroke-muted"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={`${ringClass} stroke-current transition-[stroke-dashoffset] duration-500 ease-linear`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold tabular-nums ${ringClass}`}>{secondsLeft}</span>
        </div>
      </div>

      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold">
          {questionNumber !== null
            ? `Question ${questionNumber} of ${totalQuestions}`
            : "Current question"}{" "}
          is still running
        </p>
        <p className="text-xs text-muted-foreground">
          Resume within {secondsLeft}s and you keep it. After that it scores 0 and the clock
          rolls on to the next question.
        </p>
      </div>
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
