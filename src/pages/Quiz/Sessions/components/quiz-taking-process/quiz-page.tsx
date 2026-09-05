import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitAnswer } from "../../api/submit-answer";
import { QuizInterface } from "./quiz-interface";
import { QuizLoadingView } from "../quiz-loading-view";
import { ActiveSessionView } from "./active-session-view";
import { useQuizSession } from "@/hooks/use-quiz-session";
import { useNotifications } from "@/common/Notifications";

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
  if (existingActiveSession) {
    return (
      <ActiveSessionView
        session={existingActiveSession}
        onResume={handleResumeSession}
        onRestart={handleAbandonAndRestart}
        onGoBack={handleGoBack}
        isLoading={isInitializing}
      />
    );
  }

  // ONLY the initial load blanks the page. The hook's `isInitialLoading` also goes true on a
  // null currentQuestion, which made this branch swallow the gap between two questions too:
  // QuizInterface was never reached without a question, so its own loading state was dead
  // code and the player lost the leave button and the layout on every Next. Gating on the
  // session alone lets that gap fall through to QuizInterface, which renders the same
  // QuizLoadingView inside the quiz chrome.
  if (!quizSession && !error) {
    return <QuizLoadingView words={["LOADING", "YOUR QUIZ"]} label="Loading your quiz" />;
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
        isRetrying={isInitializing}
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

// The remaining full-screen state below uses `flex-1` instead of h-screen: it renders
// inside the layout's viewport-height column, where h-screen over-measures on
// mobile and ignores the fixed-header padding (docs/RESPONSIVE.md).
// The other two — "Preparing your quiz..." and "Session In Progress" — now live in
// quiz-preparing-view.tsx and active-session-view.tsx so Storybook can render them
// without a live session.

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
