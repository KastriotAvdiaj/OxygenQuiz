import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, Play, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitAnswer } from "../../api/submit-answer";
import { QuizInterface } from "./quiz-interface";
import { useQuizSession } from "@/hooks/use-quiz-session";
import { useNotifications } from "@/common/Notifications";
import { motion } from "framer-motion";

interface QuizPageProps {
  quizId: number;
  userId: string;
  /** Present only when the player arrived through a share link (`/play/shared/:token`). */
  shareToken?: string;
}

export function QuizPage({ quizId, userId, shareToken }: QuizPageProps) {
  const navigate = useNavigate();

  const {
    quizSession,
    currentQuestion,
    lastAnswerResult,
    currentQuestionNumber,
    error,
    isInitialLoading,
    isInitializing,
    handleRetry,
    handleAnswerSubmissionSuccess,
    setCurrentQuestionNumber,
    fetchNextQuestion,
    isValidationError,
    completedAnswers,
    existingActiveSession,
    handleResumeSession,
    handleAbandonAndRestart,
  } = useQuizSession({ quizId, userId, shareToken });

  const submitAnswerMutation = useSubmitAnswer();

  const isSubmitting = submitAnswerMutation.isPending;
  const showInstantFeedback = quizSession?.hasInstantFeedback ?? false;
  const canRetry = !isValidationError;

  // Think-time measurement for latency-compensated scoring: stamp a monotonic clock the moment
  // the question reaches the screen, report the delta with the answer. The server validates the
  // value against its own window before trusting it (docs/quiz/quiz-grading.md).
  const questionShownAtRef = useRef<number | null>(null);
  useEffect(() => {
    questionShownAtRef.current = currentQuestion ? performance.now() : null;
  }, [currentQuestion]);

  // --- Event Handlers ---
  const handleSubmitAnswer = (
    selectedOptionId: number | null,
    submittedAnswer?: string,
    isTimedOut?: boolean
  ) => {
    if (!quizSession?.id || !currentQuestion || isSubmitting) return;

    const shownAt = questionShownAtRef.current;
    const clientElapsedMs =
      shownAt !== null ? Math.max(1, Math.round(performance.now() - shownAt)) : undefined;

    submitAnswerMutation.mutate(
      {
        data: {
          sessionId: quizSession.id,
          quizQuestionId: currentQuestion.quizQuestionId,
          selectedOptionId,
          submittedAnswer,
          isTimedOut: isTimedOut ?? false,
          clientElapsedMs,
        },
      },
      {
        onSuccess: (answerResult) => {
          handleAnswerSubmissionSuccess(answerResult);
        },
        onError: (error) => {
          console.error("Failed to submit answer:", error);
          const notifications = useNotifications.getState().notifications;
          const latest = notifications[notifications.length - 1];
          if (latest) {
            useNotifications.getState().dismissNotification(latest.id);
          }
        },
      }
    );
  };

  const handleGoBack = () => navigate("/choose-quiz");

  const handleNextQuestion = () => {
    if (quizSession?.id) {
      // If the last answer marked the quiz as complete, go straight to results.
      // replace: the play entry is spent — going Back from results used to land on /play, where
      // a fresh session is created on mount, so a player checking the quiz list found themselves
      // one question into a new attempt.
      if (lastAnswerResult?.isQuizComplete) {
        navigate(`/quiz/results/${quizSession.id}`, { replace: true });
        return;
      }
      setCurrentQuestionNumber((prev) => prev + 1);
      fetchNextQuestion(quizSession.id);
    }
  };

  // --- Render: Active Session Detected ---
  //
  // `error` is passed in rather than being left to the ErrorScreen below. This branch returns
  // before that one, so a failure raised *by this screen's own buttons* — Resume and Start
  // Fresh both `setError` and leave `existingActiveSession` in place — set a message that
  // nothing could ever render. The visible result was a button that did nothing at all.
  //
  // Showing it here rather than switching to the full ErrorScreen is deliberate: the two
  // actions are the recovery, so the screen the user needs is the one they are already on.
  if (existingActiveSession) {
    return (
      <ActiveSessionScreen
        session={existingActiveSession}
        onResume={handleResumeSession}
        onRestart={handleAbandonAndRestart}
        onGoBack={handleGoBack}
        isLoading={isInitializing}
        error={error}
      />
    );
  }

  if (isInitialLoading) {
    return <LoadingScreen message="Preparing your quiz..." />;
  }

  if (error) {
    return (
      <ErrorScreen
        error={error}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        isRetrying={isInitializing}
        canRetry={canRetry}
      />
    );
  }

  if (!quizSession) {
    return (
      <ErrorScreen
        error="Unable to start quiz session. The session could not be found."
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        isRetrying={isInitialLoading}
        icon="warning"
        canRetry={canRetry}
      />
    );
  }

  return (
    <QuizInterface
      sessionId={quizSession.id}
      currentQuestion={currentQuestion}
      lastAnswerResult={lastAnswerResult}
      isSubmitting={isSubmitting}
      onNextQuestion={handleNextQuestion}
      onSubmitAnswer={handleSubmitAnswer}
      currentQuestionNumber={currentQuestionNumber}
      totalQuestions={quizSession.totalQuestions}
      showInstantFeedback={showInstantFeedback}
      quizTitle={quizSession.quizTitle}
      category={quizSession.category}
      completedAnswers={completedAnswers}
      onLeave={handleGoBack}
    />
  );
}

// --- UI Components ---

// All full-screen states below use `flex-1` instead of h-screen: they render
// inside the layout's viewport-height column, where h-screen over-measures on
// mobile and ignores the fixed-header padding (docs/RESPONSIVE.md).
const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex flex-1 w-full items-center justify-center px-4 bg-background">
    <div className="quiz-card-elevated p-8 text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-quiz-primary" />
      <p className="quiz-text-primary text-xl font-medium">{message}</p>
      <div className="w-32 h-2 bg-quiz-border-subtle rounded-full mx-auto overflow-hidden">
        <div
          className="h-full bg-quiz-primary rounded-full quiz-animate-pulse"
          style={{ width: "60%" }}
        />
      </div>
    </div>
  </div>
);

const ErrorScreen = ({
  error,
  onRetry,
  onGoBack,
  isRetrying,
  canRetry,
  icon = "error",
}: {
  error: string;
  onRetry: () => void;
  onGoBack: () => void;
  isRetrying: boolean;
  canRetry: boolean;
  icon?: "error" | "warning";
}) => (
  <div className="flex flex-1 w-full items-center justify-center px-4 bg-background">
    <div className="text-center space-y-6 max-w-md p-4">
      <AlertCircle
        className={`h-16 w-16 mx-auto ${
          icon === "error" ? "text-red-400" : "text-yellow-400"
        }`}
      />
      <h2
        className={`text-2xl font-bold ${
          icon === "error" ? "text-red-400" : "text-yellow-400"
        }`}>
        Quiz Session Error
      </h2>
      <p className="text-gray-300">{error}</p>
      <div className="flex gap-4 justify-center">
        {canRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-2">
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Try Again
          </Button>
        )}
        <Button onClick={onGoBack} variant="outline">
          Back to Quiz Selection
        </Button>
      </div>
    </div>
  </div>
);

/**
 * Shown when the user navigates to a quiz they already have an active session for.
 * Offers "Resume" or "Start Fresh" choices.
 */
const ActiveSessionScreen = ({
  session,
  onResume,
  onRestart,
  onGoBack,
  isLoading,
  error,
}: {
  session: { 
    userAnswers: unknown[]; 
    totalQuestions: number; 
    startTime: string;
    quizTitle: string;
  };
  onResume: () => void;
  onRestart: () => void;
  onGoBack: () => void;
  isLoading: boolean;
  /** Shown in place of silence when Resume or Start Fresh fails. */
  error?: string | null;
}) => {
  /**
   * Local pending state for this screen's two actions.
   *
   * `isLoading` comes from `useQuizSession`'s `isInitializing`, which is read off a **ref**
   * (`initializationRef.current.isInitializing`). A ref is the right tool for the re-entrancy
   * guard it primarily serves, but it does not trigger a render — so flipping it at the start
   * of the request changed nothing on screen, and by the time anything did re-render the
   * `finally` had already set it back to false. The spinner was unreachable in practice.
   *
   * Combined with the failure path being invisible, that is the whole of "the button doesn't
   * work": no spinner on the way in, and nothing to show on the way out.
   */
  const [isBusy, setIsBusy] = useState(false);
  const run = (action: () => void | Promise<void>) => async () => {
    setIsBusy(true);
    try {
      await action();
    } finally {
      // The screen unmounts on the success paths (resume navigates or swaps the view), so this
      // only actually lands when the action failed — which is exactly when the buttons need to
      // become clickable again.
      setIsBusy(false);
    }
  };
  const busy = isLoading || isBusy;

  const answeredCount = session.userAnswers?.length ?? 0;
  const totalQuestions = session.totalQuestions;

  /**
   * "Started 1 min ago" used to be computed once, on mount, and then sat there — a screen whose
   * only moving part is elapsed time, showing a frozen clock. This screen is exactly where
   * someone lingers (it is a decision, not a step), so the one number on it was the one most
   * likely to be wrong by the time they read it.
   *
   * A timer is an external system, which is what an Effect is for (CLAUDE.md, "Effects and
   * state"). 30s rather than 1s because the value has minute granularity — a per-second tick
   * would re-render this subtree sixty times to change nothing.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const startedAgo = getRelativeTime(session.startTime, now);

  return (
    <div
      className="flex flex-1 w-full items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md space-y-6 bg-background dark:bg-muted p-4 shadow-md border border-foreground/10 rounded-xl">
        {/* Header. No icon: a clock glyph above the words "Session In Progress" restates the
            heading in a picture, and the card below already carries the progress and the
            elapsed time — the two things the icon was gesturing at. */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">
            Session In Progress
          </h2>
          <p className="text-muted-foreground text-sm">
            You have an active session for <span className="font-medium text-foreground">{session.quizTitle}</span>
          </p>
        </div>

        {/* Session Info Card */}
        {/* bg-background, not bg-card/50: the page behind this sits on a very light gradient,
            and a half-transparent card over it left only the border to say where the card was. */}
        <div className="rounded-xl border border-foreground/10 bg-background dark:bg-muted p-5 space-y-4">
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

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={run(onResume)}
            disabled={busy}
            size="lg"
            className="w-full text-base font-semibold gap-2">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            Resume Quiz
          </Button>

          <Button
            onClick={run(onRestart)}
            disabled={busy}
            size="lg"
            variant="outline"
            className="w-full text-base gap-2">
            {busy ? (
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

// --- Utility ---

/** `now` is passed in so the caller can re-run this on a tick rather than only on mount. */
function getRelativeTime(isoString: string, now: number = Date.now()): string {
  const date = new Date(isoString);
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
