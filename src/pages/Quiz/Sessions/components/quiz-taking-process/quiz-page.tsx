import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, Play, RotateCcw, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitAnswer } from "../../api/submit-answer";
import { QuizInterface } from "./quiz-interface";
import { useQuizSession } from "@/hooks/use-quiz-session";
import { useNotifications } from "@/common/Notifications";
import { motion } from "framer-motion";

interface QuizPageProps {
  quizId: number;
  userId: string;
}

export function QuizPage({ quizId, userId }: QuizPageProps) {
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
  } = useQuizSession({ quizId, userId });

  const submitAnswerMutation = useSubmitAnswer();

  const isSubmitting = submitAnswerMutation.isPending;
  const showInstantFeedback = quizSession?.hasInstantFeedback ?? false;
  const canRetry = !isValidationError;

  // --- Event Handlers ---
  const handleSubmitAnswer = (
    selectedOptionId: number | null,
    submittedAnswer?: string,
    isTimedOut?: boolean
  ) => {
    if (!quizSession?.id || !currentQuestion || isSubmitting) return;

    submitAnswerMutation.mutate(
      {
        data: {
          sessionId: quizSession.id,
          quizQuestionId: currentQuestion.quizQuestionId,
          selectedOptionId,
          submittedAnswer,
          isTimedOut: isTimedOut ?? false,
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
      // If the last answer marked the quiz as complete, go straight to results
      if (lastAnswerResult?.isQuizComplete) {
        navigate(`/quiz/results/${quizSession.id}`);
        return;
      }
      setCurrentQuestionNumber((prev) => prev + 1);
      fetchNextQuestion(quizSession.id);
    }
  };

  // --- Render: Active Session Detected ---
  if (existingActiveSession) {
    return (
      <ActiveSessionScreen
        session={existingActiveSession}
        onResume={handleResumeSession}
        onRestart={handleAbandonAndRestart}
        onGoBack={handleGoBack}
        isLoading={isInitializing}
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
    />
  );
}

// --- UI Components ---

const LoadingScreen = ({ message }: { message: string }) => (
  <div
    className="flex h-screen w-full items-center justify-center"
    style={{
      background: `
        radial-gradient(circle at 20% 80%,primary/15 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, primary/30 0%, transparent 50%),
        hsl(var(--background))
      `,
    }}>
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
  <div
    className="flex h-screen w-full items-center justify-center"
    style={{
      background: `
        radial-gradient(circle at 20% 80%, primary/15 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, primary/30 0%, transparent 50%),
        hsl(var(--background))
      `,
    }}>
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
}) => {
  const answeredCount = session.userAnswers?.length ?? 0;
  const totalQuestions = session.totalQuestions;
  const startedAgo = getRelativeTime(session.startTime);

  return (
    <div
      className="flex h-screen w-full items-center justify-center px-4"
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
            You have an active session for <span className="font-medium text-foreground">{session.quizTitle}</span>
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

// --- Utility ---

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
